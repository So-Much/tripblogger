import { computeMarkerPaintDelayMs } from './marker-paint';

describe('computeMarkerPaintDelayMs', () => {
  it('holds for freezeUntil even when epoch settle already expired', () => {
    const result = computeMarkerPaintDelayMs({
      now: 10_000,
      freezeUntil: 10_400,
      epochBumped: false,
      settleMs: 320,
      holdSwapUntil: 9_500,
    });
    expect(result.delayMs).toBe(400);
    expect(result.nextHoldUntil).toBe(10_400);
  });

  it('extends hold when epoch bumps', () => {
    const result = computeMarkerPaintDelayMs({
      now: 1_000,
      freezeUntil: 0,
      epochBumped: true,
      settleMs: 320,
      holdSwapUntil: 0,
    });
    expect(result.delayMs).toBe(320);
    expect(result.nextHoldUntil).toBe(1_320);
  });

  it('takes the max of freeze and epoch settle', () => {
    const result = computeMarkerPaintDelayMs({
      now: 1_000,
      freezeUntil: 1_800,
      epochBumped: true,
      settleMs: 320,
      holdSwapUntil: 0,
    });
    expect(result.nextHoldUntil).toBe(1_800);
    expect(result.delayMs).toBe(800);
  });
});
