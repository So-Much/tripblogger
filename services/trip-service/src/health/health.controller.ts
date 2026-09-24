import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: { ping: () => Promise<string> },
  ) {}

  @Get()
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    let db: 'ok' | 'fail' = 'ok';
    let redis: 'ok' | 'fail' = 'ok';
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      db = 'fail';
    }
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG' && pong !== 'pong') redis = 'fail';
    } catch {
      redis = 'fail';
    }
    res.status(db === 'fail' ? 503 : 200);
    return {
      status: db === 'fail' ? 'unready' : redis === 'fail' ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      checks: { db, redis },
    };
  }
}
