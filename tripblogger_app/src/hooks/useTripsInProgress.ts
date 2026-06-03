import { useQuery } from '@tanstack/react-query';
import { tripsService } from '@/src/services/api/trips.service';
import type { TripDto } from '@/src/types/trip';

function countStops(trip: TripDto): { total: number; visited: number } {
  let total = 0;
  let visited = 0;
  for (const day of trip.days ?? []) {
    for (const stop of day.stops ?? []) {
      total += 1;
      if (stop.status === 'VISITED') visited += 1;
    }
  }
  return { total, visited };
}

export function useTripsInProgress(enabled = true) {
  const query = useQuery({
    queryKey: ['trips', 'in-progress'],
    queryFn: async () => {
      const [active, planning] = await Promise.all([
        tripsService.listMine({ status: 'ACTIVE', limit: 10 }),
        tripsService.listMine({ status: 'PLANNING', limit: 10 }),
      ]);
      const seen = new Set<string>();
      const items: TripDto[] = [];
      for (const t of [...active.items, ...planning.items]) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        items.push(t);
      }
      return items;
    },
    enabled,
  });

  const trips = query.data ?? [];
  const summaries = trips.map((t) => {
    const { total, visited } = countStops(t);
    return { trip: t, total, visited };
  });

  return {
    trips,
    summaries,
    isLoading: query.isLoading,
    showSwitcher: trips.length > 0,
    showFab: trips.length > 0,
  };
}
