import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { GeoRoutingClient } from '../legs/geo-routing.client';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: { ping: () => Promise<string> },
    private readonly geoClient: GeoRoutingClient,
  ) {}

  @Get()
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async ready(@Res({ passthrough: true }) res: Response) {
    const checks = {
      db: 'ok' as 'ok' | 'fail',
      redis: 'ok' as 'ok' | 'fail',
      geo: 'ok' as 'ok' | 'fail',
    };

    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      checks.db = 'fail';
    }

    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG' && pong !== 'pong') checks.redis = 'fail';
    } catch {
      checks.redis = 'fail';
    }

    try {
      await this.geoClient.healthCheck();
    } catch {
      checks.geo = 'fail';
    }

    const status =
      checks.db === 'fail'
        ? 'unready'
        : checks.redis === 'fail' || checks.geo === 'fail'
          ? 'degraded'
          : 'ok';

    res.status(checks.db === 'fail' ? 503 : 200);
    return { status, timestamp: new Date().toISOString(), checks };
  }
}
