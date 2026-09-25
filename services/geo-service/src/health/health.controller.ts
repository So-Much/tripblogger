import { Controller, Get, Inject, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { TypesensePlaces } from '../search/typesense.client';
import { PhotonClient } from '../geocode/photon.client';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: { ping: () => Promise<string> },
    private readonly typesense: TypesensePlaces,
    private readonly photon: PhotonClient,
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
      typesense: 'ok' as 'ok' | 'fail',
      photon: 'ok' as 'ok' | 'fail',
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
      await this.typesense.healthCheck();
    } catch {
      checks.typesense = 'fail';
    }

    try {
      await this.photon.healthCheck();
    } catch {
      checks.photon = 'fail';
    }

    const status =
      checks.db === 'fail'
        ? 'unready'
        : checks.redis === 'fail' || checks.typesense === 'fail' || checks.photon === 'fail'
          ? 'degraded'
          : 'ok';

    res.status(checks.db === 'fail' ? 503 : 200);
    return { status, timestamp: new Date().toISOString(), checks };
  }
}
