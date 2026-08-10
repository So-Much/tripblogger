import { useQuery } from '@tanstack/react-query';
import { tripsService } from '../services/trips.service';
import { tripKeys } from './trip-query-keys';

export function useTrips(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: () => tripsService.listTrips(),
    enabled: options?.enabled ?? true,
  });
}
