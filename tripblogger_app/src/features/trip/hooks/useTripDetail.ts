import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { tripsService } from '../services/trips.service';
import { tripKeys } from './trip-query-keys';

export function useTripDetail(tripId: string | null | undefined) {
  return useQuery({
    queryKey: tripKeys.detail(tripId ?? ''),
    queryFn: () => tripsService.getTrip(tripId!),
    enabled: Boolean(tripId),
    placeholderData: keepPreviousData,
  });
}
