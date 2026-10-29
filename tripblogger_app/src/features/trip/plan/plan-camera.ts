import { haversineM } from '../utils/geo';

export const NEAR_STOP_M = 400;

export type PlanCameraStop = {
  id: string;
  lat: number;
  lng: number;
  status?: string | null;
};

export type PlanCameraTarget =
  | { kind: 'in-plan'; lat: number; lng: number; stopId: string }
  | { kind: 'follow-user' }
  | { kind: 'fit-stops'; coordinates: { latitude: number; longitude: number }[] }
  | { kind: 'none' };

function plottableStops(stops: PlanCameraStop[]): PlanCameraStop[] {
  return stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
}

function nearestStop(
  user: { lat: number; lng: number },
  stops: PlanCameraStop[],
): { stop: PlanCameraStop; dist: number } | null {
  let best: { stop: PlanCameraStop; dist: number } | null = null;
  for (const stop of stops) {
    const dist = haversineM(user.lat, user.lng, stop.lat, stop.lng);
    if (!best || dist < best.dist) best = { stop, dist };
  }
  return best;
}

/**
 * Camera when selecting / viewing a trip on Plan tab:
 * 1. In-plan position (near a stop, else `doing`) → fly there
 * 2. Trip in progress → follow the user (location permission via existing hook)
 * 3. Otherwise fit all plan stops
 */
export function resolvePlanCameraTarget(input: {
  inProgress: boolean;
  user: { lat: number; lng: number } | null;
  stops: PlanCameraStop[];
  nearStopM?: number;
}): PlanCameraTarget {
  const stops = plottableStops(input.stops);
  const threshold = input.nearStopM ?? NEAR_STOP_M;

  if (input.user) {
    const near = nearestStop(input.user, stops);
    if (near && near.dist <= threshold) {
      return {
        kind: 'in-plan',
        lat: near.stop.lat,
        lng: near.stop.lng,
        stopId: near.stop.id,
      };
    }
  }

  const doing = stops.find((s) => s.status === 'doing');
  if (doing) {
    return { kind: 'in-plan', lat: doing.lat, lng: doing.lng, stopId: doing.id };
  }

  if (input.inProgress) {
    return { kind: 'follow-user' };
  }

  if (stops.length === 0) return { kind: 'none' };
  return {
    kind: 'fit-stops',
    coordinates: stops.map((s) => ({ latitude: s.lat, longitude: s.lng })),
  };
}

export function planCameraEdgePadding(input: {
  topChrome: number;
  sheetPeek: number;
  side?: number;
}): { top: number; right: number; bottom: number; left: number } {
  const side = input.side ?? 40;
  return {
    top: Math.max(48, input.topChrome),
    right: side,
    bottom: Math.max(96, input.sheetPeek),
    left: side,
  };
}

/** One-shot region used when tapping a Plan stop row (does not enable follow). */
export const PLAN_STOP_FOCUS_DELTA = 0.012;

export function planStopFocusRegion(stop: { lat: number; lng: number }): {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
} {
  return {
    latitude: stop.lat,
    longitude: stop.lng,
    latitudeDelta: PLAN_STOP_FOCUS_DELTA,
    longitudeDelta: PLAN_STOP_FOCUS_DELTA,
  };
}

/** Wait for MapView layout / marker settle before fitToCoordinates. */
export const PLAN_CAMERA_DEBOUNCE_MS = 350;

/** Overlapping RN Maps animations (fit/animate) crash; snap instead if called sooner. */
export const MAP_CAMERA_ANIMATION_GAP_MS = 450;

/** Never let a native MapView throw escape into JS and kill the app. */
export function safeInvoke(fn: () => void): boolean {
  try {
    fn();
    return true;
  } catch {
    return false;
  }
}

export function shouldAnimateMapCamera(
  lastStartedAt: number,
  now: number,
  gapMs: number = MAP_CAMERA_ANIMATION_GAP_MS,
): boolean {
  return now - lastStartedAt >= gapMs;
}

export function mapCameraAnimationDuration(
  lastStartedAt: number,
  now: number,
  intendedMs: number,
  gapMs: number = MAP_CAMERA_ANIMATION_GAP_MS,
): number {
  return shouldAnimateMapCamera(lastStartedAt, now, gapMs) ? intendedMs : 0;
}

export type FrameHandle = number;

export type CoalescedInvoker = {
  run: (fn: () => void) => void;
  dispose: () => void;
};

/**
 * Last-write-wins per frame. Rapid flyTo/fitRoute/follow calls collapse to one
 * native camera invocation so we never overlap MapView animations in one tick.
 */
export function createCoalescedInvoker(opts?: {
  scheduleFrame?: (fn: () => void) => FrameHandle;
  cancelFrame?: (id: FrameHandle) => void;
}): CoalescedInvoker {
  const scheduleFrame =
    opts?.scheduleFrame ??
    ((fn) => requestAnimationFrame(fn) as FrameHandle);
  const cancelFrame =
    opts?.cancelFrame ?? ((id) => cancelAnimationFrame(id as number));
  let handle: FrameHandle | null = null;
  let pending: (() => void) | null = null;
  let alive = true;

  const flush = () => {
    handle = null;
    const job = pending;
    pending = null;
    if (alive && job) safeInvoke(job);
  };

  return {
    run(fn) {
      if (!alive) return;
      pending = fn;
      if (handle != null) return;
      handle = scheduleFrame(flush);
    },
    dispose() {
      alive = false;
      pending = null;
      if (handle == null) return;
      cancelFrame(handle);
      handle = null;
    },
  };
}

export function canInvokeMapCamera(input: {
  mounted: boolean;
  mapReady: boolean;
  generation: number;
  scheduledGeneration: number;
}): boolean {
  return (
    input.mounted &&
    input.mapReady &&
    input.generation === input.scheduledGeneration
  );
}

type TimeoutHandle = ReturnType<typeof setTimeout> | number;

export type DeferredRunner = {
  schedule: (fn: () => void) => void;
  cancel: () => void;
  dispose: () => void;
};

/**
 * Last-write-wins delayed runner. Rapid tab/day switches cancel in-flight
 * camera work so we never fitToCoordinates on a torn-down MapView.
 */
export function createDeferredRunner(opts: {
  delayMs: number;
  setTimeoutFn?: (fn: () => void, ms: number) => TimeoutHandle;
  clearTimeoutFn?: (id: TimeoutHandle) => void;
}): DeferredRunner {
  const setTimeoutFn = opts.setTimeoutFn ?? setTimeout;
  const clearTimeoutFn = opts.clearTimeoutFn ?? clearTimeout;
  let handle: TimeoutHandle | null = null;
  let alive = true;

  const cancel = () => {
    if (handle == null) return;
    clearTimeoutFn(handle);
    handle = null;
  };

  return {
    schedule(fn) {
      if (!alive) return;
      cancel();
      handle = setTimeoutFn(() => {
        handle = null;
        if (alive) fn();
      }, opts.delayMs);
    },
    cancel,
    dispose() {
      alive = false;
      cancel();
    },
  };
}
