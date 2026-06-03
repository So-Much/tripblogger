import { useEffect, useMemo, useState } from 'react';
import type { PlannerStop, RouteLegSummary } from '@/src/types/trip-planner';
import { fetchDrivingRoute } from '@/src/utils/fetch-driving-route';
import { legDirectionMarkers } from '@/src/utils/leg-bearing';

type LatLng = { latitude: number; longitude: number };

const BATCH_SIZE = 3;

async function fetchLeg(from: PlannerStop, to: PlannerStop) {
  const route = await fetchDrivingRoute(
    { lat: from.lat, lng: from.lng },
    { lat: to.lat, lng: to.lng },
  );
  return {
    fromClientId: from.clientId,
    toClientId: to.clientId,
    distanceKm: Math.round((route.distanceM / 1000) * 10) / 10,
    durationMin: Math.max(1, Math.round(route.durationS / 60)),
    coordinates: route.coordinates,
  };
}

export function useTripRoutePolylines(stops: PlannerStop[]) {
  const [polylineCoords, setPolylineCoords] = useState<LatLng[]>([]);
  const [legSummaries, setLegSummaries] = useState<RouteLegSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const directionMarkers = useMemo(
    () =>
      legDirectionMarkers(
        stops.map((s) => ({ clientId: s.clientId, lat: s.lat, lng: s.lng })),
      ),
    [stops],
  );

  useEffect(() => {
    if (stops.length < 2) {
      setPolylineCoords([]);
      setLegSummaries([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const legCount = stops.length - 1;
      const legResults: Awaited<ReturnType<typeof fetchLeg>>[] = new Array(legCount);

      for (let batchStart = 0; batchStart < legCount; batchStart += BATCH_SIZE) {
        const batch = Array.from({ length: Math.min(BATCH_SIZE, legCount - batchStart) }, (_, j) => {
          const i = batchStart + j;
          return fetchLeg(stops[i], stops[i + 1]).then((r) => {
            legResults[i] = r;
          });
        });
        await Promise.all(batch);
        if (cancelled) return;
      }

      const merged: LatLng[] = [];
      const legs: RouteLegSummary[] = [];

      for (const leg of legResults) {
        if (!leg) continue;
        const coords = leg.coordinates;
        if (merged.length > 0 && coords.length > 0) {
          merged.push(...coords.slice(1));
        } else {
          merged.push(...coords);
        }
        legs.push({
          fromClientId: leg.fromClientId,
          toClientId: leg.toClientId,
          distanceKm: leg.distanceKm,
          durationMin: leg.durationMin,
        });
      }

      if (!cancelled) {
        setPolylineCoords(merged);
        setLegSummaries(legs);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [stops]);

  return { polylineCoords, legSummaries, directionMarkers, loading };
}
