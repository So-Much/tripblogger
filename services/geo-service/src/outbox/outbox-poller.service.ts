import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { publish, type RedisLike, type DomainEvent } from '@tripblogger/events';
import { PlaceOutboxEntity } from '../entities/place-outbox.entity';
import { REDIS_CLIENT } from '../health/health.controller';

@Injectable()
export class OutboxPollerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPollerService.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(PlaceOutboxEntity) private readonly outbox: Repository<PlaceOutboxEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: RedisLike,
  ) {}

  onModuleInit() {
    this.intervalId = setInterval(() => {
      void this.poll();
    }, 5000);
    this.logger.log('Outbox poller started');
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.logger.log('Outbox poller stopped');
  }

  private async poll() {
    try {
      const pending = await this.outbox.find({
        where: { publishedAt: IsNull() },
        order: { createdAt: 'ASC' },
        take: 100,
      });

      for (const entry of pending) {
        try {
          const event = JSON.parse(entry.payloadJson) as DomainEvent<unknown>;
          await publish(this.redis, 'place.events', event);
          entry.publishedAt = new Date();
          await this.outbox.save(entry);
          this.logger.debug(`Published ${entry.eventType} (${entry.id})`);
        } catch (err) {
          this.logger.error(`Failed to publish ${entry.id}: ${err}`);
        }
      }
    } catch (err) {
      this.logger.error(`Outbox poll failed: ${err}`);
    }
  }
}
