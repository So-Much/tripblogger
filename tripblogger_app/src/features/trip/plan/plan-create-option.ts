import { normalizeVi } from './destination-catalog';

export type PlanCreateTravelMode = 'motorbike' | 'car' | 'foot' | 'bike';

export type CustomOptionCommit<T extends string> =
  | { kind: 'known'; id: T }
  | { kind: 'custom'; label: string }
  | { kind: 'empty' };

/** Trim draft; treat comma-only / whitespace as empty (comma is a submit key). */
export function parseCustomOptionDraft(raw: string): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const withoutComma = trimmed.endsWith(',') ? trimmed.slice(0, -1).trim() : trimmed;
  return withoutComma || null;
}

export function matchKnownOption<T extends string>(
  raw: string,
  ids: readonly T[],
  labels: Record<T, string>,
): T | null {
  const parsed = parseCustomOptionDraft(raw);
  if (!parsed) return null;
  const needle = normalizeVi(parsed);
  for (const id of ids) {
    if (normalizeVi(id) === needle || normalizeVi(labels[id]) === needle) {
      return id;
    }
  }
  return null;
}

export function commitCustomOption<T extends string>(
  raw: string,
  ids: readonly T[],
  labels: Record<T, string>,
): CustomOptionCommit<T> {
  const parsed = parseCustomOptionDraft(raw);
  if (!parsed) return { kind: 'empty' };
  const known = matchKnownOption(parsed, ids, labels);
  if (known) return { kind: 'known', id: known };
  return { kind: 'custom', label: parsed };
}

/** Custom travel labels stay UI-only; DTO still needs a valid travel-mode enum. */
export function resolveTravelModeForDto(
  lastKnown: PlanCreateTravelMode | null,
  fallback: PlanCreateTravelMode = 'motorbike',
): PlanCreateTravelMode {
  return lastKnown ?? fallback;
}
