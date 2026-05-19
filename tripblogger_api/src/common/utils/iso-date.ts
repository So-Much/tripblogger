/** Normalize DB Date values to ISO-8601 UTC strings for JSON responses. */
export function toIsoString(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(trimmed);
    const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const asUtc = hasTz ? trimmed : `${normalized}Z`;
    const ms = Date.parse(asUtc);
    if (Number.isNaN(ms)) return null;
    return new Date(ms).toISOString();
  }
  const ms = value.getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}
