import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  applyMotorbikeFactor,
  osrmProfileForPlanMode,
  type PlanTravelMode,
} from '@tripblogger/itinerary-engine';
import type { TripStopEntity } from '../trips/entities/trip-stop.entity';

type Leg = { durationS: number | null; distanceM: number | null };

@Injectable()
export class GeoRoutingClient {
  private readonly logger = new Logger(GeoRoutingClient.name);
  private failures: number[] = [];
  private openedAt = 0;

  constructor(private readonly config: ConfigService) {}

  async recomputeDayLegs(orderedStops: TripStopEntity[], defaultTravelMode: PlanTravelMode): Promise<void> {
    if (!orderedStops.length) return;
    const now = new Date();
    const first = orderedStops[0];
    first.travelFromPrevSeconds = 0;
    first.travelFromPrevDistanceM = 0;
    first.travelModeUsed = null;
    first.travelComputedAt = now;
    if (orderedStops.length === 1) return;

    for (let i = 1; i < orderedStops.length; i++) {
      const prev = orderedStops[i - 1];
      const stop = orderedStops[i];
      const planMode = (stop.travelModeOverride ?? defaultTravelMode) as PlanTravelMode;
      try {
        const legs = await this.tableLegs(
          [
            { lat: Number(prev.lat), lng: Number(prev.lng) },
            { lat: Number(stop.lat), lng: Number(stop.lng) },
          ],
          osrmProfileForPlanMode(planMode),
        );
        const raw = legs[0] ?? { durationS: null, distanceM: null };
        stop.travelFromPrevDistanceM = raw.distanceM;
        stop.travelModeUsed = planMode;
        stop.travelComputedAt = now;
        if (raw.durationS == null) {
          stop.travelFromPrevSeconds = null;
        } else {
          const factored = Math.round(applyMotorbikeFactor(raw.durationS, planMode));
          stop.travelFromPrevSeconds = factored <= 0 ? 60 : factored;
        }
      } catch (err) {
        this.logger.warn(`leg failed: ${err instanceof Error ? err.message : err}`);
        stop.travelFromPrevSeconds = null;
        stop.travelFromPrevDistanceM = null;
        stop.travelModeUsed = planMode;
        stop.travelComputedAt = now;
      }
    }
  }

  async tableLegs(
    points: Array<{ lat: number; lng: number }>,
    mode: 'car' | 'bike' | 'foot',
  ): Promise<Leg[]> {
    if (this.isOpen()) {
      return points.slice(1).map(() => ({ durationS: null, distanceM: null }));
    }
    const base = this.config.get<string>('GEO_BASE_URL') ?? 'http://127.0.0.1:3003';
    const token = this.config.get<string>('GEO_INTERNAL_TOKEN') ?? '';
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/internal/routing/table-legs`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-internal-token': token },
        body: JSON.stringify({ points, mode }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`geo ${res.status}`);
      this.record(true);
      const body = (await res.json()) as { legs: Leg[] };
      return body.legs ?? [];
    } catch (err) {
      this.record(false);
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private record(ok: boolean) {
    const now = Date.now();
    this.failures = this.failures.filter((t) => now - t < 30_000);
    if (!ok) this.failures.push(now);
    if (this.failures.length >= 5) this.openedAt = now;
  }

  private isOpen() {
    return this.openedAt > 0 && Date.now() - this.openedAt < 60_000;
  }
}
