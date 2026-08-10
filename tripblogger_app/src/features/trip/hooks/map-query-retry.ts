import { isAbortedError } from '../services/map.service';

/** Transient network/API failures — not cancelled requests, not successful empty lists. */
export const MAP_LIST_RETRY_COUNT = 3;

export function shouldRetryMapListQuery(failureCount: number, error: unknown): boolean {
  if (isAbortedError(error)) return false;
  return failureCount < MAP_LIST_RETRY_COUNT;
}

/** Exponential backoff: ~1s, 2s, 4s (capped). */
export function mapListRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 8000);
}
