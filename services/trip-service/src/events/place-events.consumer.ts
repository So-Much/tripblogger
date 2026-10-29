import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hostname } from 'os';
import Redis from 'ioredis';
import { consumeOnce, dlqStreamOf, ensureGroup, PLACE_EVENTS_STREAM, type RedisLike } from '@tripblogger/events';
import { PlaceSyncService } from './place-sync.service';
import { metrics } from '../observability';

export const PLACE_EVENTS_GROUP = 'trip-service';

@Injectable()
export class PlaceEventsConsumer implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(PlaceEventsConsumer.name);
  private redis: Redis | null = null;
  private stopped = false;
  private loop: Promise<void> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly sync: PlaceSyncService,
  ) {}

  onApplicationBootstrap() {
    if (this.config.get('EVENTS_CONSUMER') === '0') return;
    // XREADGROUP BLOCK holds the connection, so the consumer gets its own.
    this.redis = new Redis({
      host: this.config.get('REDIS_HOST'),
      port: this.config.get('REDIS_PORT'),
      maxRetriesPerRequest: null,
    });
    const redis = this.redis;
    if (!metrics.registry.getSingleMetric('events_dlq_length')) {
      metrics.gauge('events_dlq_length', `Entries waiting in ${dlqStreamOf(PLACE_EVENTS_STREAM)}`, () =>
        redis.xlen(dlqStreamOf(PLACE_EVENTS_STREAM)),
      );
    }
    this.loop = this.run();
  }

  async onModuleDestroy() {
    this.stopped = true;
    await this.loop?.catch(() => undefined);
    this.redis?.disconnect();
  }

  private async run() {
    const redis = this.redis as unknown as RedisLike;
    const consumer = `${hostname()}-${process.pid}`;
    while (!this.stopped) {
      try {
        await ensureGroup(redis, PLACE_EVENTS_STREAM, PLACE_EVENTS_GROUP);
        break;
      } catch (err) {
        this.logger.warn(`ensureGroup failed, retrying: ${err instanceof Error ? err.message : err}`);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    this.logger.log(`Consuming ${PLACE_EVENTS_STREAM} as ${consumer}`);
    while (!this.stopped) {
      try {
        const res = await consumeOnce(redis, {
          stream: PLACE_EVENTS_STREAM,
          group: PLACE_EVENTS_GROUP,
          consumer,
          blockMs: 5000,
          handler: async (event) => {
            const n = await this.sync.apply(event);
            if (n) this.logger.log(`${event.type} ${event.id}: synced ${n} stop(s)`);
          },
          onError: (err, id) =>
            this.logger.warn(`place event ${id} failed: ${err instanceof Error ? err.message : err}`),
        });
        if (res.deadLettered) this.logger.error(`${res.deadLettered} place event(s) moved to DLQ`);
      } catch (err) {
        this.logger.error(`consumer loop error: ${err instanceof Error ? err.message : err}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
}
