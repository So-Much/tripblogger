import { Controller, Get, Inject, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DataSource } from 'typeorm';
import { TypesensePlaces } from '../search/typesense.client';
import { PhotonClient, type PhotonHealth } from '../geocode/photon.client';

import { REDIS_CLIENT } from '../redis.tokens';

export { REDIS_CLIENT };

@SkipThrottle()
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
      typesense: 'ok' as 'ok' | 'fail' | 'disabled',
      photon: 'ok' as PhotonHealth,
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

    if (!this.typesense.enabled) {
      checks.typesense = 'disabled';
    } else {
      try {
        await this.typesense.healthCheck();
      } catch {
        checks.typesense = 'fail';
      }
    }

    checks.photon = await this.photon.health();

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
