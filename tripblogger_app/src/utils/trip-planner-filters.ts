import type { TripPlannerFilters } from '@/src/types/trip-planner';

export function toggleTripTypeCode(
  codes: string[] | undefined,
  code: string,
): string[] | undefined {
  const next = new Set(codes ?? []);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  return next.size > 0 ? [...next] : undefined;
}

export function sameTripPlannerFilters(a: TripPlannerFilters, b: TripPlannerFilters): boolean {
  const ac = [...(a.typeCodes ?? [])].sort().join(',');
  const bc = [...(b.typeCodes ?? [])].sort().join(',');
  return a.sort === b.sort && ac === bc;
}

export function tripTypeCodesQueryParam(codes?: string[]): string | undefined {
  if (!codes?.length) return undefined;
  return codes.join(',');
}
