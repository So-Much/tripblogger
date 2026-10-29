/**
 * Pure scheduling for MapCanvas painted POI list.
 * Keeps custom react-native-maps Markers stable across sheet + category churn.
 */
export function computeMarkerPaintDelayMs(opts: {
  now: number;
  freezeUntil: number;
  epochBumped: boolean;
  settleMs: number;
  holdSwapUntil: number;
}): { delayMs: number; nextHoldUntil: number } {
  let nextHoldUntil = opts.holdSwapUntil;
  if (opts.epochBumped) {
    nextHoldUntil = Math.max(nextHoldUntil, opts.now + opts.settleMs);
  }
  nextHoldUntil = Math.max(nextHoldUntil, opts.freezeUntil);
  return {
    delayMs: Math.max(0, nextHoldUntil - opts.now),
    nextHoldUntil,
  };
}
