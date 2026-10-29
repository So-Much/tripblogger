const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPersistedLocationId(id: string | undefined | null): boolean {
  return Boolean(id && UUID_RE.test(id));
}

export function parseExternalPinId(id: string): { source: 'photon' | 'nominatim'; placeId: string } | null {
  if (!id.startsWith('external:')) return null;
  const parts = id.split(':');
  if (parts.length < 3) return null;
  const source = parts[1] as 'photon' | 'nominatim';
  if (source !== 'photon' && source !== 'nominatim') return null;
  return { source, placeId: parts.slice(2).join(':') };
}
