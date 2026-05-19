import { normalizePostMediaItem } from '../posts/media.types';

export type CommerceMediaItem = ReturnType<typeof normalizePostMediaItem>;

export function parseProductMediaJson(raw: string | null | undefined): CommerceMediaItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.map((item) => normalizePostMediaItem(item as Record<string, unknown>));
  } catch {
    return [];
  }
}
