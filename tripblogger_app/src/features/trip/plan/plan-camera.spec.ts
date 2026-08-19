import {
  MAP_CAMERA_ANIMATION_GAP_MS,
  PLAN_CAMERA_DEBOUNCE_MS,
  canInvokeMapCamera,
  createCoalescedInvoker,
  createDeferredRunner,
  mapCameraAnimationDuration,
  planCameraEdgePadding,
  planStopFocusRegion,
  resolvePlanCameraTarget,
  safeInvoke,
  shouldAnimateMapCamera,
} from './plan-camera';

const stops = [
  { id: 'a', lat: 11.94, lng: 108.44, status: 'todo' as const },
  { id: 'b', lat: 11.95, lng: 108.45, status: 'todo' as const },
  { id: 'c', lat: 11.96, lng: 108.46, status: 'doing' as const },
];

describe('resolvePlanCameraTarget', () => {
  it('prefers the in-plan stop the user is near', () => {
    const target = resolvePlanCameraTarget({
      inProgress: true,
      user: { lat: 11.9401, lng: 108.4401 },
      stops,
    });
    expect(target).toEqual({
      kind: 'in-plan',
      lat: 11.94,
      lng: 108.44,
      stopId: 'a',
    });
  });

  it('falls back to the doing stop when GPS is not near any stop', () => {
    const target = resolvePlanCameraTarget({
      inProgress: false,
      user: { lat: 10.0, lng: 106.0 },
      stops,
    });
    expect(target.kind).toBe('in-plan');
    if (target.kind === 'in-plan') {
      expect(target.stopId).toBe('c');
    }
  });

  it('follows the user when the trip is in progress and no in-plan position is known', () => {
    const target = resolvePlanCameraTarget({
      inProgress: true,
      user: { lat: 10.0, lng: 106.0 },
      stops: stops.map((s) => ({ ...s, status: 'todo' as const })),
    });
    expect(target).toEqual({ kind: 'follow-user' });
  });

  it('follows the user when in progress even before GPS arrives', () => {
    const target = resolvePlanCameraTarget({
      inProgress: true,
      user: null,
      stops: stops.map((s) => ({ ...s, status: 'todo' as const })),
    });
    expect(target).toEqual({ kind: 'follow-user' });
  });

  it('fits all plan stops otherwise', () => {
    const target = resolvePlanCameraTarget({
      inProgress: false,
      user: null,
      stops: stops.map((s) => ({ ...s, status: 'todo' as const })),
    });
    expect(target.kind).toBe('fit-stops');
    if (target.kind === 'fit-stops') {
      expect(target.coordinates).toEqual([
        { latitude: 11.94, longitude: 108.44 },
        { latitude: 11.95, longitude: 108.45 },
        { latitude: 11.96, longitude: 108.46 },
      ]);
    }
  });

  it('returns none when there is nothing to frame', () => {
    expect(
      resolvePlanCameraTarget({ inProgress: false, user: null, stops: [] }),
    ).toEqual({ kind: 'none' });
  });

  it('ignores stops without finite coordinates', () => {
    const target = resolvePlanCameraTarget({
      inProgress: false,
      user: null,
      stops: [
        { id: 'bad', lat: Number.NaN, lng: 0, status: 'todo' },
        { id: 'ok', lat: 11.94, lng: 108.44, status: 'todo' },
      ],
    });
    expect(target.kind).toBe('fit-stops');
    if (target.kind === 'fit-stops') {
      expect(target.coordinates).toEqual([{ latitude: 11.94, longitude: 108.44 }]);
    }
  });
});

describe('planCameraEdgePadding', () => {
  it('pads for top chips and bottom sheet peek', () => {
    expect(
      planCameraEdgePadding({ topChrome: 172, sheetPeek: 220 }),
    ).toEqual({
      top: 172,
      right: 40,
      bottom: 220,
      left: 40,
    });
  });

  it('enforces minimums so markers are not clipped', () => {
    expect(planCameraEdgePadding({ topChrome: 10, sheetPeek: 10, side: 24 })).toEqual({
      top: 48,
      right: 24,
      bottom: 96,
      left: 24,
    });
  });
});

describe('canInvokeMapCamera', () => {
  it('allows a call only when the map is mounted, ready, and the generation matches', () => {
    expect(
      canInvokeMapCamera({ mounted: true, mapReady: true, generation: 3, scheduledGeneration: 3 }),
    ).toBe(true);
  });

  it('blocks calls after unmount, before onMapReady, or from a cancelled generation', () => {
    expect(
      canInvokeMapCamera({ mounted: false, mapReady: true, generation: 1, scheduledGeneration: 1 }),
    ).toBe(false);
    expect(
      canInvokeMapCamera({ mounted: true, mapReady: false, generation: 1, scheduledGeneration: 1 }),
    ).toBe(false);
    expect(
      canInvokeMapCamera({ mounted: true, mapReady: true, generation: 4, scheduledGeneration: 3 }),
    ).toBe(false);
  });
});

describe('createDeferredRunner', () => {
  it('debounces so only the last schedule runs after PLAN_CAMERA_DEBOUNCE_MS', () => {
    expect(PLAN_CAMERA_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(PLAN_CAMERA_DEBOUNCE_MS).toBeLessThanOrEqual(400);

    const pending: Array<{ fn: () => void; ms: number }> = [];
    const runner = createDeferredRunner({
      delayMs: PLAN_CAMERA_DEBOUNCE_MS,
      setTimeoutFn: (fn, ms) => {
        pending.push({ fn, ms });
        return pending.length;
      },
      clearTimeoutFn: () => {
        pending.pop();
      },
    });

    const calls: string[] = [];
    runner.schedule(() => calls.push('day-1'));
    runner.schedule(() => calls.push('day-2'));
    expect(calls).toEqual([]);
    expect(pending).toHaveLength(1);
    expect(pending[0].ms).toBe(PLAN_CAMERA_DEBOUNCE_MS);

    pending[0].fn();
    expect(calls).toEqual(['day-2']);
  });

  it('does not run a cancelled or disposed callback', () => {
    const pending: Array<() => void> = [];
    const runner = createDeferredRunner({
      delayMs: PLAN_CAMERA_DEBOUNCE_MS,
      setTimeoutFn: (fn) => {
        pending.push(fn);
        return pending.length;
      },
      clearTimeoutFn: () => {
        pending.pop();
      },
    });

    const calls: string[] = [];
    runner.schedule(() => calls.push('stale'));
    runner.cancel();
    expect(pending).toHaveLength(0);

    runner.schedule(() => calls.push('late'));
    runner.dispose();
    expect(pending).toHaveLength(0);
    expect(calls).toEqual([]);
  });
});

describe('planStopFocusRegion', () => {
  it('frames a stop with a one-shot region (does not lock follow)', () => {
    expect(planStopFocusRegion({ lat: 11.94, lng: 108.44 })).toEqual({
      latitude: 11.94,
      longitude: 108.44,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    });
  });
});

describe('safeInvoke', () => {
  it('runs the callback and returns true when it does not throw', () => {
    const calls: string[] = [];
    expect(safeInvoke(() => calls.push('ok'))).toBe(true);
    expect(calls).toEqual(['ok']);
  });

  it('swallows native/JS throws so a torn-down MapView cannot crash the app', () => {
    expect(
      safeInvoke(() => {
        throw new Error('MapView not ready');
      }),
    ).toBe(false);
  });
});

describe('mapCameraAnimationDuration', () => {
  it('keeps the intended duration when the previous camera call has settled', () => {
    expect(MAP_CAMERA_ANIMATION_GAP_MS).toBeGreaterThanOrEqual(400);
    expect(mapCameraAnimationDuration(0, 500, 600)).toBe(600);
    expect(shouldAnimateMapCamera(0, 500)).toBe(true);
  });

  it('snaps with duration 0 when the user hammers camera before the gap elapses', () => {
    expect(mapCameraAnimationDuration(100, 200, 600)).toBe(0);
    expect(shouldAnimateMapCamera(100, 200)).toBe(false);
  });
});

describe('createCoalescedInvoker', () => {
  it('runs only the last callback scheduled in the same frame', () => {
    const frames: Array<() => void> = [];
    const invoker = createCoalescedInvoker({
      scheduleFrame: (fn) => {
        frames.push(fn);
        return frames.length;
      },
      cancelFrame: () => {
        frames.pop();
      },
    });

    const calls: string[] = [];
    invoker.run(() => calls.push('fly-a'));
    invoker.run(() => calls.push('fly-b'));
    expect(calls).toEqual([]);
    expect(frames).toHaveLength(1);

    frames[0]();
    expect(calls).toEqual(['fly-b']);
  });

  it('does not run after dispose, even if a frame was already queued', () => {
    const frames: Array<() => void> = [];
    const invoker = createCoalescedInvoker({
      scheduleFrame: (fn) => {
        frames.push(fn);
        return frames.length;
      },
      cancelFrame: () => {
        frames.pop();
      },
    });

    const calls: string[] = [];
    invoker.run(() => calls.push('stale'));
    invoker.dispose();
    expect(frames).toHaveLength(0);
    expect(calls).toEqual([]);
  });

  it('swallows throws from the coalesced callback', () => {
    const frames: Array<() => void> = [];
    const invoker = createCoalescedInvoker({
      scheduleFrame: (fn) => {
        frames.push(fn);
        return frames.length;
      },
      cancelFrame: () => {
        frames.pop();
      },
    });

    invoker.run(() => {
      throw new Error('native');
    });
    expect(() => frames[0]()).not.toThrow();
  });
});
