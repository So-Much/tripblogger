import type { DomainEvent } from './envelope';

export type RedisLike = {
  xadd(stream: string, id: string, ...args: string[]): Promise<string>;
  xgroup(
    cmd: string,
    ...args: Array<string | number>
  ): Promise<unknown>;
  xreadgroup(
    ...args: Array<string | number>
  ): Promise<Array<[string, Array<[string, string[]]>]> | null>;
  xack(stream: string, group: string, id: string): Promise<number>;
};

export async function publish(
  redis: RedisLike,
  stream: string,
  event: DomainEvent<unknown>,
): Promise<string> {
  return redis.xadd(stream, '*', 'data', JSON.stringify(event));
}

export async function consume(
  redis: RedisLike,
  stream: string,
  group: string,
  consumer: string,
  handler: (event: DomainEvent<unknown>) => Promise<void>,
): Promise<void> {
  try {
    await redis.xgroup('CREATE', stream, group, '0', 'MKSTREAM');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('BUSYGROUP')) throw err;
  }
  const res = await redis.xreadgroup(
    'GROUP',
    group,
    consumer,
    'COUNT',
    10,
    'BLOCK',
    1,
    'STREAMS',
    stream,
    '>',
  );
  if (!res) return;
  for (const [, entries] of res) {
    for (const [id, fields] of entries) {
      const dataIdx = fields.indexOf('data');
      const raw = dataIdx >= 0 ? fields[dataIdx + 1] : '';
      const event = JSON.parse(raw) as DomainEvent<unknown>;
      await handler(event);
      await redis.xack(stream, group, id);
    }
  }
}
