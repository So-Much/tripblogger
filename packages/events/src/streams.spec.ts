import { randomUUID } from 'crypto';
import { consume, consumeOnce, ensureGroup, publish, type RedisLike } from './streams';
import type { DomainEvent } from './envelope';

type Entry = { id: string; fields: string[] };
type Pending = { id: string; deliveries: number };

function createFakeRedis() {
  const streams = new Map<string, Entry[]>();
  const cursors = new Map<string, number>();
  const pending = new Map<string, Pending[]>();
  let seq = 1;

  const pel = (stream: string, group: string) => {
    const key = `${stream}:${group}`;
    if (!pending.has(key)) pending.set(key, []);
    return pending.get(key)!;
  };
  const find = (stream: string, id: string) => (streams.get(stream) ?? []).find((e) => e.id === id);
  const requireGroup = (stream: string, group: string) => {
    if (!cursors.has(`${stream}:${group}`)) {
      throw new Error(`NOGROUP No such key '${stream}' or consumer group '${group}'`);
    }
  };

  const redis: RedisLike = {
    async xadd(stream, ...args) {
      const star = args.indexOf('*');
      const id = `${seq++}-0`;
      const list = streams.get(stream) ?? [];
      list.push({ id, fields: args.slice(star + 1) });
      streams.set(stream, list);
      return id;
    },
    async xgroup(cmd, ...args) {
      const key = `${args[0]}:${args[1]}`;
      if (cmd === 'CREATE') {
        if (cursors.has(key)) throw new Error('BUSYGROUP Consumer Group name already exists');
        cursors.set(key, 0);
        if (!streams.has(String(args[0]))) streams.set(String(args[0]), []);
      }
      return 'OK';
    },
    async xreadgroup(...args) {
      const group = String(args[1]);
      const stream = String(args[args.indexOf('STREAMS') + 1]);
      requireGroup(stream, group);
      const key = `${stream}:${group}`;
      const list = streams.get(stream) ?? [];
      const from = cursors.get(key) ?? 0;
      const batch = list.slice(from);
      if (!batch.length) return null;
      cursors.set(key, list.length);
      for (const e of batch) pel(stream, group).push({ id: e.id, deliveries: 1 });
      return [[stream, batch.map((e) => [e.id, e.fields] as [string, string[]])]];
    },
    async xack(stream, group, ...ids) {
      const list = pel(stream, group);
      const before = list.length;
      pending.set(
        `${stream}:${group}`,
        list.filter((p) => !ids.includes(p.id)),
      );
      return before - pel(stream, group).length;
    },
    async xautoclaim(stream, group) {
      requireGroup(String(stream), String(group));
      const claimed = pel(String(stream), String(group));
      for (const p of claimed) p.deliveries++;
      return ['0-0', claimed.map((p) => [p.id, find(String(stream), p.id)?.fields ?? null])];
    },
    async xpending(stream, group, id) {
      const p = pel(String(stream), String(group)).find((x) => x.id === id);
      return p ? [[p.id, 'c1', 0, p.deliveries]] : [];
    },
    async xlen(stream) {
      return (streams.get(stream) ?? []).length;
    },
  };
  return { redis, streams, pel };
}

function event(type = 'trip.created'): DomainEvent<{ tripId: string }> {
  return { id: randomUUID(), type, occurredAt: new Date().toISOString(), payload: { tripId: 't1' } };
}

describe('redis streams helpers', () => {
  it('publishes then consumes one message', async () => {
    const { redis } = createFakeRedis();
    const xid = await publish(redis, 'trip.events', event());
    expect(xid).toBeTruthy();
    const seen: DomainEvent<unknown>[] = [];
    await consume(redis, 'trip.events', 'g1', 'c1', async (e) => {
      seen.push(e);
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('trip.created');
    expect((seen[0].payload as { tripId: string }).tripId).toBe('t1');
  });

  it('keeps a failed entry pending and retries it on the next pass', async () => {
    const { redis, pel } = createFakeRedis();
    await ensureGroup(redis, 's', 'g');
    await publish(redis, 's', event());
    let calls = 0;
    const handler = async () => {
      calls++;
      if (calls === 1) throw new Error('db down');
    };
    const first = await consumeOnce(redis, { stream: 's', group: 'g', consumer: 'c1', handler, minIdleMs: 0 });
    expect(first).toEqual({ processed: 0, failed: 1, deadLettered: 0 });
    expect(pel('s', 'g')).toHaveLength(1);

    const second = await consumeOnce(redis, { stream: 's', group: 'g', consumer: 'c1', handler, minIdleMs: 0 });
    expect(second.processed).toBe(1);
    expect(pel('s', 'g')).toHaveLength(0);
  });

  it('moves an entry to the DLQ after maxDeliveries', async () => {
    const { redis, streams, pel } = createFakeRedis();
    await ensureGroup(redis, 's', 'g');
    await publish(redis, 's', event());
    const handler = async () => {
      throw new Error('always fails');
    };
    const opts = { stream: 's', group: 'g', consumer: 'c1', handler, minIdleMs: 0, maxDeliveries: 3 };
    await consumeOnce(redis, opts);
    await consumeOnce(redis, opts);
    const last = await consumeOnce(redis, opts);
    expect(last.deadLettered).toBe(1);
    expect(pel('s', 'g')).toHaveLength(0);
    const dlq = streams.get('s.dlq') ?? [];
    expect(dlq).toHaveLength(1);
    expect(dlq[0].fields).toContain('always fails');
  });

  it('recreates a lost consumer group and still delivers entries already in the stream', async () => {
    const { redis } = createFakeRedis();
    await publish(redis, 's', event());
    const seen: string[] = [];
    const opts = {
      stream: 's',
      group: 'g',
      consumer: 'c1',
      handler: async (e: DomainEvent<unknown>) => {
        seen.push(e.type);
      },
    };
    await expect(consumeOnce(redis, opts)).resolves.toEqual({ processed: 0, failed: 0, deadLettered: 0 });
    const next = await consumeOnce(redis, opts);
    expect(next.processed).toBe(1);
    expect(seen).toEqual(['trip.created']);
  });

  it('dead-letters unparsable payloads immediately', async () => {
    const { redis, streams } = createFakeRedis();
    await ensureGroup(redis, 's', 'g');
    await redis.xadd('s', '*', 'data', '{not json');
    const res = await consumeOnce(redis, {
      stream: 's',
      group: 'g',
      consumer: 'c1',
      handler: async () => undefined,
    });
    expect(res.deadLettered).toBe(1);
    expect(streams.get('s.dlq')).toHaveLength(1);
  });
});
