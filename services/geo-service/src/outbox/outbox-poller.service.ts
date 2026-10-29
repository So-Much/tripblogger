import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { IsNull, LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { publish, PLACE_EVENTS_STREAM, type RedisLike, type DomainEvent } from '@tripblogger/events';
import { PlaceOutboxEntity } from '../entities/place-outbox.entity';
import { REDIS_CLIENT } from '../redis.tokens';
import { metrics } from '../observability';

const LOCK_KEY = 'outbox:geo:lock';
const LOCK_TTL_MS = 15_000;
const MAX_ATTEMPTS = 10;

type LockingRedis = RedisLike & {
  set(key: string, value: string, px: 'PX', ttl: number, nx: 'NX'): Promise<'OK' | null>;
  eval(script: string, keys: number, ...args: string[]): Promise<unknown>;
};

const RELEASE_LOCK = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private readonly instanceId = randomUUID();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    @InjectRepository(PlaceOutboxEntity) private readonly outbox: Repository<PlaceOutboxEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: LockingRedis,
  ) {}

  onModuleInit() {
    if (!metrics.registry.getSingleMetric('geo_outbox_pending')) {
      metrics.gauge('geo_outbox_pending', 'Outbox rows not yet published', () =>
        this.outbox.count({ where: { publishedAt: IsNull(), attempts: LessThan(MAX_ATTEMPTS) } }),
      );
      metrics.gauge('geo_outbox_stuck', `Outbox rows that failed ${MAX_ATTEMPTS} times`, () =>
        this.outbox.count({ where: { publishedAt: IsNull(), attempts: MoreThanOrEqual(MAX_ATTEMPTS) } }),
      );
    }
    this.intervalId = setInterval(() => {
      void this.poll();
    }, 5000);
    this.logger.log('Outbox poller started');
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.logger.log('Outbox poller stopped');
  }

  /** Only one replica publishes at a time, so entries are not sent twice by concurrent pollers. */
  async poll(): Promise<void> {
    if (this.running) return;
    this.running = true;
    let locked = false;
    try {
      locked = (await this.redis.set(LOCK_KEY, this.instanceId, 'PX', LOCK_TTL_MS, 'NX')) === 'OK';
      if (!locked) return;

      const pending = await this.outbox.find({
        where: { publishedAt: IsNull(), attempts: LessThan(MAX_ATTEMPTS) },
        order: { createdAt: 'ASC' },
        take: 100,
      });

      for (const entry of pending) {
        try {
          const event = JSON.parse(entry.payloadJson) as DomainEvent<unknown>;
          await publish(this.redis, PLACE_EVENTS_STREAM, event);
          entry.publishedAt = new Date();
          entry.lastError = null;
        } catch (err) {
          entry.attempts += 1;
          entry.lastError = (err instanceof Error ? err.message : String(err)).slice(0, 500);
          this.logger.error(`Failed to publish ${entry.id} (attempt ${entry.attempts}): ${entry.lastError}`);
        }
        await this.outbox.save(entry);
      }
    } catch (err) {
      this.logger.error(`Outbox poll failed: ${err}`);
    } finally {
      if (locked) {
        await this.redis.eval(RELEASE_LOCK, 1, LOCK_KEY, this.instanceId).catch(() => undefined);
      }
      this.running = false;
    }
  }
}
