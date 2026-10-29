import { findCatalogEntry } from './destination-catalog';

export type DestinationChip =
  | { id: string; kind: 'catalog'; name: string; lat: number; lng: number }
  | { id: string; kind: 'free'; name: string };

export const DESTINATION_LABEL_MAX = 255;

let chipSeq = 0;
export function newChipId(): string {
  chipSeq += 1;
  return `dest-${chipSeq}-${Date.now()}`;
}

export function joinDestinationLabel(chips: DestinationChip[]): string {
  return chips.map((c) => c.name).join(', ');
}

export function wouldExceedLabelMax(chips: DestinationChip[], nextName: string): boolean {
  const next = [...chips, { id: 'tmp', kind: 'free' as const, name: nextName }];
  return joinDestinationLabel(next).length > DESTINATION_LABEL_MAX;
}

export function firstCatalogCoords(
  chips: DestinationChip[],
): { lat: number; lng: number } | null {
  const hit = chips.find((c) => c.kind === 'catalog');
  if (!hit || hit.kind !== 'catalog') return null;
  return { lat: hit.lat, lng: hit.lng };
}

export function tryCommitDestination(
  raw: string,
  chips: DestinationChip[],
):
  | { ok: true; chip: DestinationChip }
  | { ok: false; reason: 'empty' | 'need_catalog' | 'label_too_long' } {
  const name = raw.trim();
  if (!name) return { ok: false, reason: 'empty' };
  if (wouldExceedLabelMax(chips, name)) return { ok: false, reason: 'label_too_long' };

  const entry = findCatalogEntry(name);
  if (entry) {
    return {
      ok: true,
      chip: {
        id: newChipId(),
        kind: 'catalog',
        name: entry.name,
        lat: entry.lat,
        lng: entry.lng,
      },
    };
  }

  const hasCatalog = chips.some((c) => c.kind === 'catalog');
  if (!hasCatalog) return { ok: false, reason: 'need_catalog' };

  return { ok: true, chip: { id: newChipId(), kind: 'free', name } };
}
