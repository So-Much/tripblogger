/** Join "category · address · distance", skipping empty parts. */
export function formatResultSubline(parts: {
  category: string | null;
  address: string | null;
  distanceLabel: string | null;
}): string {
  return [parts.category, parts.address, parts.distanceLabel]
    .map((p) => (p ?? '').trim())
    .filter((p) => p.length > 0)
    .join(' · ');
}
