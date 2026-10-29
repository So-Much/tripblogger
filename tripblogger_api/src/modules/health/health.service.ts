import { Inject, Injectable, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis/redis.module';

export type ReadyStatus = 'ok' | 'degraded' | 'unready';
export type CheckStatus = 'ok' | 'fail';

export type ReadyResponse = {
  status: ReadyStatus;
  timestamp: string;
  checks: {
    db: CheckStatus;
    redis: CheckStatus;
  };
};

@Injectable()
export class HealthService {
  constructor(
    @Optional() private readonly dataSource?: DataSource,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis,
  ) {}

  async getReady(): Promise<{ body: ReadyResponse; httpStatus: number }> {
    const db = await this.pingDb();
    const redis = await this.pingRedis();
    let status: ReadyStatus = 'ok';
    let httpStatus = 200;
    if (db === 'fail') {
      status = 'unready';
      httpStatus = 503;
    } else if (redis === 'fail') {
      status = 'degraded';
    }
    return {
      httpStatus,
      body: {
        status,
        timestamp: new Date().toISOString(),
        checks: { db, redis },
      },
    };
  }

  private async pingDb(): Promise<CheckStatus> {
    if (!this.dataSource) return 'fail';
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'fail';
    }
  }

  private async pingRedis(): Promise<CheckStatus> {
    if (!this.redis) return 'fail';
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' || pong === 'pong' ? 'ok' : 'fail';
    } catch {
      return 'fail';
    }
  }
}
