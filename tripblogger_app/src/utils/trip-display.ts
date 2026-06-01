import type { TripDayDto, TripStatus, TripStopDto, TripStopStatus } from '@/src/types/trip';

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  DRAFT: 'Bản nháp',
  PLANNING: 'Lên kế hoạch',
  ACTIVE: 'Đang diễn ra',
  COMPLETED: 'Hoàn thành',
  ARCHIVED: 'Lưu trữ',
  CANCELLED: 'Đã hủy',
};

export const STOP_STATUS_LABELS: Record<TripStopStatus, string> = {
  PLANNED: 'Chưa đến',
  VISITING: 'Đang tham quan',
  VISITED: 'Đã ghé',
  SKIPPED: 'Bỏ qua',
};

export function tripStopName(stop: TripStopDto): string {
  return stop.location?.name ?? stop.customName ?? 'Điểm dừng';
}

export function formatTripDateRange(start: string, end: string): string {
  const s = formatTripDate(start);
  const e = formatTripDate(end);
  if (s === e) return s;
  return `${s} → ${e}`;
}

export function formatTripDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function countTripStops(days: TripDayDto[] | undefined): number {
  return (days ?? []).reduce((sum, d) => sum + (d.stops?.length ?? 0), 0);
}

export function countVisitedStops(days: TripDayDto[] | undefined): number {
  return (days ?? []).reduce(
    (sum, d) => sum + (d.stops?.filter((s) => s.status === 'VISITED').length ?? 0),
    0,
  );
}

export function tripProgressPercent(days: TripDayDto[] | undefined): number {
  const total = countTripStops(days);
  if (total === 0) return 0;
  return Math.round((countVisitedStops(days) / total) * 100);
}

export function formatVnd(amount: number | null | undefined): string | null {
  if (amount == null) return null;
  return `${amount.toLocaleString('vi-VN')} ₫`;
}
