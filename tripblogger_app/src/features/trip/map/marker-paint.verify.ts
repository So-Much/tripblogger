/**
 * Run: npx tsx src/features/trip/map/marker-paint.verify.ts
 */
import { computeMarkerPaintDelayMs } from './marker-paint';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const held = computeMarkerPaintDelayMs({
  now: 10_000,
  freezeUntil: 10_400,
  epochBumped: false,
  settleMs: 320,
  holdSwapUntil: 9_500,
});
assert(held.delayMs === 400, 'freeze must delay paint');
assert(held.nextHoldUntil === 10_400, 'freeze wins over expired hold');

const epoch = computeMarkerPaintDelayMs({
  now: 1_000,
  freezeUntil: 0,
  epochBumped: true,
  settleMs: 320,
  holdSwapUntil: 0,
});
assert(epoch.delayMs === 320, 'epoch settle delay');

const both = computeMarkerPaintDelayMs({
  now: 1_000,
  freezeUntil: 1_800,
  epochBumped: true,
  settleMs: 320,
  holdSwapUntil: 0,
});
assert(both.nextHoldUntil === 1_800, 'max(freeze, settle)');
assert(both.delayMs === 800, 'delay matches max hold');

console.log('marker-paint.verify: all assertions passed');
