import type { DomainEvent } from './envelope';

type StreamEntry = [string, string[] | null];

export type RedisLike = {
  xadd(stream: string, ...args: string[]): Promise<string | null>;
  xgroup(cmd: string, ...args: Array<string | number>): Promise<unknown>;
  xreadgroup(...args: Array<string | number>): Promise<Array<[string, StreamEntry[]]> | null>;
  xack(stream: string, group: string, ...ids: string[]): Promise<number>;
  xautoclaim(...args: Array<string | number>): Promise<unknown>;
  xpending(...args: Array<string | number>): Promise<unknown>;
  xlen(stream: string): Promise<number>;
};

export const DEFAULT_MAX_STREAM_LEN = 100_000;

export function dlqStreamOf(stream: string): string {
  return `${stream}.dlq`;
}

export async function publish(
  redis: RedisLike,
  stream: string,
  event: DomainEvent<unknown>,
  maxLen = DEFAULT_MAX_STREAM_LEN,
): Promise<string> {
  const id = await redis.xadd(stream, 'MAXLEN', '~', String(maxLen), '*', 'data', JSON.stringify(event));
  if (!id) throw new Error(`xadd to ${stream} returned no id`);
  return id;
}

export async function ensureGroup(redis: RedisLike, stream: string, group: string): Promise<void> {
  try {
    await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('BUSYGROUP')) throw err;
  }
}

export type ConsumeOptions = {
  stream: string;
  group: string;
  consumer: string;
  handler: (event: DomainEvent<unknown>, meta: { id: string; deliveries: number }) => Promise<void>;
  count?: number;
  /** 0 = do not block. Blocking needs a dedicated Redis connection. */
  blockMs?: number;
  /** Pending entries idle longer than this are reclaimed and retried. */
  minIdleMs?: number;
  /** After this many deliveries a failing entry moves to the DLQ stream. */
  maxDeliveries?: number;
  dlqStream?: string;
  onError?: (err: unknown, id: string) => void;
};

export type ConsumeResult = { processed: number; failed: number; deadLettered: number };

function fieldValue(fields: string[], name: string): string | null {
  const idx = fields.indexOf(name);
  return idx >= 0 ? (fields[idx + 1] ?? null) : null;
}

async function deliveryCount(redis: RedisLike, stream: string, group: string, id: string): Promise<number> {
  const rows = (await redis.xpending(stream, group, id, id, 1)) as Array<[string, string, number, number]>;
  return Number(rows?.[0]?.[3] ?? 1);
}

/**
 * One pass: retry stale pending entries, then read new ones.
 * Handlers must be idempotent — delivery is at-least-once.
 */
export async function consumeOnce(redis: RedisLike, opts: ConsumeOptions): Promise<ConsumeResult> {
  try {
    return await consumePass(redis, opts);
  } catch (err) {
    // The group vanishes when Redis restarts without persistence or the stream key is deleted.
    // Recreate it from id 0 so entries already in the stream are still delivered.
    if (!(err instanceof Error && err.message.includes('NOGROUP'))) throw err;
    await ensureGroup(redis, opts.stream, opts.group);
    return { processed: 0, failed: 0, deadLettered: 0 };
  }
}

async function consumePass(redis: RedisLike, opts: ConsumeOptions): Promise<ConsumeResult> {
  const count = opts.count ?? 10;
  const minIdleMs = opts.minIdleMs ?? 30_000;
  const maxDeliveries = opts.maxDeliveries ?? 5;
  const dlq = opts.dlqStream ?? dlqStreamOf(opts.stream);
  const result: ConsumeResult = { processed: 0, failed: 0, deadLettered: 0 };

  const claimed = (await redis.xautoclaim(
    opts.stream,
    opts.group,
    opts.consumer,
    minIdleMs,
    '0-0',
    'COUNT',
    count,
  )) as [string, StreamEntry[]] | null;
  const retries = (claimed?.[1] ?? []).filter((e): e is [string, string[]] => Array.isArray(e?.[1]));

  const fresh = await redis.xreadgroup(
    'GROUP',
    opts.group,
    opts.consumer,
    'COUNT',
    count,
    ...(opts.blockMs ? ['BLOCK', opts.blockMs] : []),
    'STREAMS',
    opts.stream,
    '>',
  );
  const freshEntries = (fresh ?? []).flatMap(([, entries]) =>
    entries.filter((e): e is [string, string[]] => Array.isArray(e?.[1])),
  );

  const work: Array<{ id: string; fields: string[]; retried: boolean }> = [
    ...retries.map(([id, fields]) => ({ id, fields, retried: true })),
    ...freshEntries.map(([id, fields]) => ({ id, fields, retried: false })),
  ];

  for (const { id, fields, retried } of work) {
    const raw = fieldValue(fields, 'data') ?? '';
    const deliveries = retried ? await deliveryCount(redis, opts.stream, opts.group, id) : 1;
    try {
      const event = JSON.parse(raw) as DomainEvent<unknown>;
      await opts.handler(event, { id, deliveries });
      await redis.xack(opts.stream, opts.group, id);
      result.processed++;
    } catch (err) {
      result.failed++;
      opts.onError?.(err, id);
      const poison = err instanceof SyntaxError;
      if (poison || deliveries >= maxDeliveries) {
        const reason = err instanceof Error ? err.message : String(err);
        await redis.xadd(
          dlq,
          '*',
          'data',
          raw,
          'error',
          reason.slice(0, 500),
          'sourceId',
          id,
          'group',
          opts.group,
          'deliveries',
          String(deliveries),
        );
        await redis.xack(opts.stream, opts.group, id);
        result.deadLettered++;
      }
    }
  }
  return result;
}

/** Back-compat helper: ensure group, then run one non-blocking pass. */
export async function consume(
  redis: RedisLike,
  stream: string,
  group: string,
  consumer: string,
  handler: (event: DomainEvent<unknown>) => Promise<void>,
): Promise<void> {
  await ensureGroup(redis, stream, group);
  await consumeOnce(redis, { stream, group, consumer, handler: (e) => handler(e) });
}
