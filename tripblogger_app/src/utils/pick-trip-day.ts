import type { TripDayDto, TripDto } from '@/src/types/trip';

export function pickTripDayForNewStop(trip: TripDto): TripDayDto | null {
  const days = [...(trip.days ?? [])].sort((a, b) => a.dayNumber - b.dayNumber);
  if (!days.length) return null;

  const today = new Date().toISOString().slice(0, 10);
  const todayDay = days.find((d) => d.date === today);
  if (todayDay) return todayDay;

  if (trip.status === 'PLANNING') return days[0];

  const withPlanned = days.find((d) =>
    (d.stops ?? []).some((s) => s.status === 'PLANNED' || s.status === 'VISITING'),
  );
  return withPlanned ?? days[days.length - 1];
}
