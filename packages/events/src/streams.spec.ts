import { randomUUID } from 'crypto';
import { consume, publish, type RedisLike } from './streams';
import type { DomainEvent } from './envelope';

function createFakeRedis(): RedisLike & { streams: Map<string, Array<{ id: string; fields: string[] }>> } {
  const streams = new Map<string, Array<{ id: string; fields: string[] }>>();
  const groups = new Set<string>();
  let seq = 1;
  return {
    streams,
    async xadd(stream, _id, ...args) {
      const id = `${seq++}-0`;
      const list = streams.get(stream) ?? [];
      list.push({ id, fields: args });
      streams.set(stream, list);
      return id;
    },
    async xgroup(cmd, ...args) {
      if (cmd === 'CREATE') {
        const key = `${args[0]}:${args[1]}`;
        if (groups.has(key)) {
          throw new Error('BUSYGROUP Consumer Group name already exists');
        }
        groups.add(key);
        const stream = String(args[0]);
        if (!streams.has(stream)) streams.set(stream, []);
      }
      return 'OK';
    },
    async xreadgroup(...args) {
      const streamIdx = args.indexOf('STREAMS');
      const stream = String(args[streamIdx + 1]);
      const list = streams.get(stream) ?? [];
      if (!list.length) return null;
      const batch = list.splice(0, list.length);
      return [[stream, batch.map((e) => [e.id, e.fields] as [string, string[]])]];
    },
    async xack() {
      return 1;
    },
  };
}

describe('redis streams helpers', () => {
  it('publishes then consumes one message', async () => {
    const redis = createFakeRedis();
    const event: DomainEvent<{ tripId: string }> = {
      id: randomUUID(),
      type: 'trip.created',
      occurredAt: new Date().toISOString(),
      payload: { tripId: 't1' },
    };
    const xid = await publish(redis, 'trip.events', event);
    expect(xid).toBeTruthy();
    const seen: DomainEvent<unknown>[] = [];
    await consume(redis, 'trip.events', 'g1', 'c1', async (e) => {
      seen.push(e);
    });
    expect(seen).toHaveLength(1);
    expect(seen[0].type).toBe('trip.created');
    expect((seen[0].payload as { tripId: string }).tripId).toBe('t1');
  });
});
