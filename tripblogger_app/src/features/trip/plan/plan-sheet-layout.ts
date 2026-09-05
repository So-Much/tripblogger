export const PLAN_SHEET_CLOSED_INDEX = -1;
export const PLAN_SHEET_MID_INDEX = 1;
export const PLAN_SHEET_FULL_INDEX = 2;

/** Matches TripBottomNav height above safe-area padding (padTop 8 + icon 24 + gap 2 + label ~14). */
export const PLAN_NAV_BAR_OFFSET = 48;

/** Place cards: thicker than RN hairline so rows read as distinct. */
export const PLAN_STOP_CARD_BORDER_WIDTH = 2;

/** Handle + title/chips + ~1 stop row. Still below mid on typical phones. */
const PEEK_MIN_PX = 220;

export type PlanSheetListKind = 'sheet-scroll' | 'draggable';

export type PlanSheetHostKind = PlanSheetListKind;

export type PlanSheetTabKind = 'day' | 'ideas' | 'overview';

/** Avoid remounting RNGH scrollables mid-gesture (snap / chip tap / row drag). */
export const PLAN_HOST_SWAP_DEBOUNCE_MS = 220;

/** Wait out list remount + camera fit before snapToIndex or applying a pending trip. */
export const PLAN_SHEET_SNAP_DEBOUNCE_MS = PLAN_HOST_SWAP_DEBOUNCE_MS;

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

export function planSheetBottomInset(safeBottom: number): number {
  return Math.max(safeBottom, 8) + PLAN_NAV_BAR_OFFSET;
}

export function planSheetAvailableHeight(input: {
  windowHeight: number;
  sheetTopInset: number;
  bottomInset: number;
}): number {
  return Math.max(180, input.windowHeight - input.sheetTopInset - input.bottomInset);
}

/**
 * Shared chrome for the Plan timeline sheet and the stop-settings sibling.
 * Full snap fills the gap below search + trip switcher and above the tab bar.
 */
export function planSheetChromeLayout(input: {
  windowHeight: number;
  sheetTopInset: number;
  safeBottom: number;
}): {
  bottomInset: number;
  availableHeight: number;
  snapPoints: [number, number, number];
} {
  const bottomInset = planSheetBottomInset(input.safeBottom);
  const availableHeight = planSheetAvailableHeight({
    windowHeight: input.windowHeight,
    sheetTopInset: input.sheetTopInset,
    bottomInset,
  });
  return {
    bottomInset,
    availableHeight,
    snapPoints: planSheetSnapPoints(availableHeight),
  };
}

export function planStopSettingsSheetIndex(visible: boolean): number {
  return visible ? PLAN_SHEET_MID_INDEX : PLAN_SHEET_CLOSED_INDEX;
}

/**
 * Controlled Gorhom `index` for the settings sibling. Must *change* on dismiss
 * (`1` → `-1`). A hardcoded `-1` plus imperative `snapToIndex` leaves a ghost
 * sheet at index >= 0 after close.
 */
export function planSettingsSheetCommandIndex(openRequested: boolean): number {
  return planStopSettingsSheetIndex(openRequested);
}

export type PlanSettingsGesturePolicy = {
  enableContentPanningGesture: boolean;
  enableHandlePanningGesture: boolean;
  enablePanDownToClose: boolean;
};

/**
 * Interactive while opening (index already 1, onChange may still be -1) or
 * while a ghost sheet is still attached after dismiss.
 */
export function planSettingsSheetInteractive(input: {
  openRequested: boolean;
  sheetIndex: number;
}): boolean {
  return input.openRequested || input.sheetIndex >= 0;
}

/** Hit-test on open immediately — waiting for onChange(-1→1) freezes the sheet. */
export function planSettingsPointerEvents(input: {
  openRequested: boolean;
  sheetIndex: number;
}): 'none' | 'box-none' {
  return planSettingsSheetInteractive(input) ? 'box-none' : 'none';
}

/**
 * Handle pans the sheet like the timeline; content pan stays off so
 * BottomSheetScrollView can scroll at mid. Do not wait for onChange.
 */
export function planSettingsGesturePolicy(input: {
  openRequested: boolean;
  sheetIndex: number;
}): PlanSettingsGesturePolicy {
  const on = planSettingsSheetInteractive(input);
  return {
    enableContentPanningGesture: false,
    enableHandlePanningGesture: on,
    enablePanDownToClose: on,
  };
}

export function planSheetCanInvoke(mounted: boolean): boolean {
  return mounted;
}

export function planSheetNeedsSnap(input: {
  mounted: boolean;
  openRequested: boolean;
  currentIndex: number;
  targetIndex: number;
}): boolean {
  return (
    planSheetCanInvoke(input.mounted) &&
    input.openRequested &&
    input.currentIndex !== input.targetIndex
  );
}

export function planSheetNeedsClose(input: {
  mounted: boolean;
  openRequested: boolean;
  currentIndex: number;
}): boolean {
  return (
    planSheetCanInvoke(input.mounted) &&
    !input.openRequested &&
    input.currentIndex >= 0
  );
}

export type PlanTimelineBodyKind = 'list' | 'error' | 'loading';

export function planTimelineBodyKind(input: {
  hasTrip: boolean;
  isError: boolean;
}): PlanTimelineBodyKind {
  if (input.isError && !input.hasTrip) return 'error';
  if (!input.hasTrip) return 'loading';
  return 'list';
}

/**
 * Once the itinerary list has mounted inside the timeline BottomSheet, keep it
 * through subsequent loads so BottomSheetFlatList / DraggableFlatList are not
 * torn down on trip switch.
 */
export function resolvePlanTimelineBody(input: {
  current: PlanTimelineBodyKind | null;
  wanted: PlanTimelineBodyKind;
}): PlanTimelineBodyKind {
  if (input.current === 'list' && input.wanted !== 'error') {
    return 'list';
  }
  return input.wanted;
}

export function resolvePendingTripSwap(input: {
  requestedTripId: string;
  currentTripId: string | null;
  settingsSheetIndex: number;
}): { activeTripId: string; pendingTripId: string | null } {
  if (input.currentTripId == null) {
    return { activeTripId: input.requestedTripId, pendingTripId: null };
  }
  if (input.requestedTripId === input.currentTripId) {
    return { activeTripId: input.currentTripId, pendingTripId: null };
  }
  if (input.settingsSheetIndex >= 0) {
    return {
      activeTripId: input.currentTripId,
      pendingTripId: input.requestedTripId,
    };
  }
  return { activeTripId: input.requestedTripId, pendingTripId: null };
}

/** Apply a stashed trip only after settings `onChange(-1)`. */
export function consumePendingTripAfterDismiss(input: {
  pendingTripId: string | null;
  settingsSheetIndex: number;
}): string | null {
  if (input.settingsSheetIndex !== PLAN_SHEET_CLOSED_INDEX) return null;
  return input.pendingTripId;
}

export function planStopDetailVisible(input: {
  detailStopId: string | null;
  stop: { id: string } | null;
}): boolean {
  return (
    input.detailStopId != null &&
    input.stop != null &&
    input.stop.id === input.detailStopId
  );
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
  const reorderSnap = input.sheetIndex >= PLAN_SHEET_MID_INDEX;
  const handleOn = input.gesturesEnabled && !input.dragging;
  return {
    enableContentPanningGesture: false,
    enableHandlePanningGesture: handleOn,
    canDragReorder: reorderSnap && input.gesturesEnabled,
    listKind: reorderSnap ? 'draggable' : 'sheet-scroll',
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
 * Day / Overview / Ideas must share one native scroll host. Only peek vs
 * mid/full (reorder) may remount the list — chip taps must not.
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
