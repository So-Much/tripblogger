export const PLAN_SHEET_FULL_INDEX = 2;

/** Handle + title/chips + ~1 stop row. Still below mid on typical phones. */
const PEEK_MIN_PX = 220;

export type PlanSheetListKind = 'sheet-scroll' | 'draggable';

export type PlanSheetHostKind = PlanSheetListKind;

export type PlanSheetTabKind = 'day' | 'ideas' | 'overview';

/** Avoid remounting RNGH scrollables mid-gesture (snap / chip tap / row drag). */
export const PLAN_HOST_SWAP_DEBOUNCE_MS = 220;

export type PlanSheetGesturePolicy = {
  enableContentPanningGesture: boolean;
  enableHandlePanningGesture: boolean;
  canDragReorder: boolean;
  listKind: PlanSheetListKind;
};

/**
 * Peek / mid / full heights in the space below trip chips and above the nav bar.
 * Peek is large enough to show a couple of itinerary rows without covering chips.
 */
export function planSheetSnapPoints(
  availableHeight: number,
): [number, number, number] {
  const full = Math.max(180, Math.round(availableHeight));
  const mid = Math.round(full * 0.55);
  const peekTarget = Math.max(PEEK_MIN_PX, Math.round(full * 0.34));
  const peek = Math.max(96, Math.min(mid - 16, peekTarget));
  return [peek, mid, full];
}

export function planSheetPeekHeight(availableHeight: number): number {
  return planSheetSnapPoints(availableHeight)[0];
}

/**
 * Gorhom translates a full-height sheet; only `containerHeight - position`
 * is actually on screen. Use this, not the max snap, as the list viewport.
 */
export function planSheetVisibleHeight(
  containerHeight: number,
  positionFromTop: number,
): number {
  'worklet';
  if (!Number.isFinite(containerHeight) || !Number.isFinite(positionFromTop)) {
    return 0;
  }
  return Math.max(0, containerHeight - positionFromTop);
}

/**
 * Scrollable height inside the currently visible sheet (handle / sticky
 * header already subtracted). Keeps peek/mid lists from sizing to the
 * full snap — that clipped extra height is why pans bounce back.
 */
export function planSheetListViewportHeight(
  visibleSheetHeight: number,
  chromeHeight: number,
): number {
  'worklet';
  if (!Number.isFinite(visibleSheetHeight) || !Number.isFinite(chromeHeight)) {
    return 0;
  }
  return Math.max(0, Math.round(visibleSheetHeight - chromeHeight));
}

/**
 * Gorhom locks inner scroll while `enableContentPanningGesture` is true and the
 * sheet is not fully extended. Keep content panning off so the list can scroll
 * at peek/mid; expand/collapse via the handle.
 *
 * Gorhom still sizes the sheet body to the *highest* snap and translates it.
 * The list must be given `planSheetListViewportHeight(visible, handle)` or it
 * lays out at full-snap height, clips at peek, and pans bounce back.
 */
export function planSheetGesturePolicy(input: {
  sheetIndex: number;
  dragging: boolean;
  gesturesEnabled: boolean;
}): PlanSheetGesturePolicy {
  const atFull = input.sheetIndex === PLAN_SHEET_FULL_INDEX;
  const handleOn = input.gesturesEnabled && !input.dragging;
  return {
    enableContentPanningGesture: false,
    enableHandlePanningGesture: handleOn,
    canDragReorder: atFull,
    listKind: atFull ? 'draggable' : 'sheet-scroll',
  };
}

/**
 * Keep the mounted scroll host stable while a row drag is in flight so
 * DraggableFlatList is not torn down mid-gesture.
 */
export function resolvePlanSheetHost(input: {
  wanted: PlanSheetHostKind;
  current: PlanSheetHostKind | null;
  dragging: boolean;
}): PlanSheetHostKind {
  if (input.dragging && input.current != null) {
    return input.current;
  }
  return input.wanted;
}

/**
 * Day / Overview / Ideas must share one native scroll host. Only peek/mid vs
 * full (reorder) may remount the list — chip taps must not.
 */
export function wantedPlanSheetHost(input: {
  tabKind: PlanSheetTabKind;
  listKind: PlanSheetListKind;
}): PlanSheetListKind {
  void input.tabKind;
  return input.listKind;
}

export function samePlanSheetTab(
  a: { kind: PlanSheetTabKind; dayId?: string },
  b: { kind: PlanSheetTabKind; dayId?: string },
): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'day') return a.dayId === b.dayId;
  return true;
}
