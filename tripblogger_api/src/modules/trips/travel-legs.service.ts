import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  applyMotorbikeFactor,
  osrmProfileForPlanMode,
  type PlanTravelMode,
} from '@tripblogger/itinerary-engine';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis/redis.module';
import { OsrmProvider, type TravelMode } from '../map/providers/osrm.provider';
import type { TripStopEntity } from './entities/trip-stop.entity';

const LEG_TTL_S = 7 * 24 * 60 * 60;

type LegCacheValue = { durationS: number | null; distanceM: number | null };

@Injectable()
export class TravelLegsService {
  private readonly logger = new Logger(TravelLegsService.name);

  constructor(
    private readonly osrm: OsrmProvider,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Recompute travel_from_prev_* for ordered day stops (mutates in place).
   * First stop travel = 0; subsequent legs use override ?? trip default.
   */
  async recomputeDayLegs(
    orderedStops: TripStopEntity[],
    defaultTravelMode: PlanTravelMode,
  ): Promise<void> {
    if (!orderedStops.length) return;

    const now = new Date();
    const first = orderedStops[0];
    first.travelFromPrevSeconds = 0;
    first.travelFromPrevDistanceM = 0;
    first.travelModeUsed = null;
    first.travelComputedAt = now;

    if (orderedStops.length === 1) return;

    type Pending = {
      index: number; // destination stop index
      planMode: PlanTravelMode;
      osrmMode: TravelMode;
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      cacheKey: string;
    };

    const pending: Pending[] = [];

    for (let i = 1; i < orderedStops.length; i++) {
      const prev = orderedStops[i - 1];
      const stop = orderedStops[i];
      const planMode = (stop.travelModeOverride ?? defaultTravelMode) as PlanTravelMode;
      const osrmMode = osrmProfileForPlanMode(planMode);
      const from = { lat: Number(prev.lat), lng: Number(prev.lng) };
      const to = { lat: Number(stop.lat), lng: Number(stop.lng) };
      const cacheKey = this.legCacheKey(osrmMode, from, to);

      const cached = await this.cacheGet(cacheKey);
      if (cached) {
        this.applyLeg(stop, cached, planMode, now);
      } else {
        pending.push({ index: i, planMode, osrmMode, from, to, cacheKey });
      }
    }

    // Fetch uncached legs, batching consecutive same-osrmMode segments
    let cursor = 0;
    while (cursor < pending.length) {
      const start = cursor;
      const mode = pending[start].osrmMode;
      while (cursor < pending.length && pending[cursor].osrmMode === mode) {
        // Keep contiguous only when destination of prev pending is source of next
        if (
          cursor > start &&
          pending[cursor].index !== pending[cursor - 1].index + 1
        ) {
          break;
        }
        cursor++;
      }
      const batch = pending.slice(start, cursor);
      const points = [batch[0].from, ...batch.map((b) => b.to)];
      const legs = await this.osrm.tableLegs(points, mode);

      for (let j = 0; j < batch.length; j++) {
        const item = batch[j];
        const raw = legs[j] ?? { durationS: null, distanceM: null };
        await this.cacheSet(item.cacheKey, raw);
        this.applyLeg(orderedStops[item.index], raw, item.planMode, now);
      }
    }
  }

  private applyLeg(
    stop: TripStopEntity,
    raw: LegCacheValue,
    planMode: PlanTravelMode,
    now: Date,
  ): void {
    stop.travelFromPrevDistanceM = raw.distanceM;
    stop.travelModeUsed = planMode;
    stop.travelComputedAt = now;
    if (raw.durationS == null) {
      stop.travelFromPrevSeconds = null;
    } else {
      const factored = Math.round(applyMotorbikeFactor(raw.durationS, planMode));
      stop.travelFromPrevSeconds = factored <= 0 ? 60 : factored;
    }
  }

  private round4(n: number): string {
    return (Math.round(n * 10000) / 10000).toFixed(4);
  }

  private legCacheKey(
    osrmMode: TravelMode,
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): string {
    return `map:leg:v1:${osrmMode}:${this.round4(from.lat)},${this.round4(from.lng)}:${this.round4(to.lat)},${this.round4(to.lng)}`;
  }

  private async cacheGet(key: string): Promise<LegCacheValue | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as LegCacheValue;
    } catch {
      return null;
    }
  }

  private async cacheSet(key: string, value: LegCacheValue): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', LEG_TTL_S);
    } catch (err) {
      this.logger.warn(
        `Redis set failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
