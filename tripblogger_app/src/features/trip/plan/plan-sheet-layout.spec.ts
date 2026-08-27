import {
  PLAN_HOST_SWAP_DEBOUNCE_MS,
  PLAN_NAV_BAR_OFFSET,
  PLAN_SHEET_CLOSED_INDEX,
  PLAN_SHEET_FULL_INDEX,
  PLAN_SHEET_MID_INDEX,
  PLAN_SHEET_SNAP_DEBOUNCE_MS,
  PLAN_STOP_CARD_BORDER_WIDTH,
  consumePendingTripAfterDismiss,
  planSettingsGesturePolicy,
  planSettingsPointerEvents,
  planSettingsSheetCommandIndex,
  planSettingsSheetInteractive,
  planSheetCanInvoke,
  planSheetChromeLayout,
  planSheetGesturePolicy,
  planSheetListViewportHeight,
  planSheetNeedsClose,
  planSheetNeedsSnap,
  planSheetSnapPoints,
  planSheetVisibleHeight,
  planStopDetailVisible,
  planStopSettingsSheetIndex,
  planTimelineBodyKind,
  resolvePendingTripSwap,
  resolvePlanSheetHost,
  resolvePlanTimelineBody,
  samePlanSheetTab,
  wantedPlanSheetHost,
} from './plan-sheet-layout';

describe('planSheetSnapPoints', () => {
  it('keeps peek large enough for handle plus one or two stop rows', () => {
    const [peek, mid, full] = planSheetSnapPoints(530);
    expect(full).toBe(530);
    expect(peek).toBeGreaterThanOrEqual(220);
    expect(peek).toBeLessThan(mid);
    expect(mid).toBeLessThan(full);
  });

  it('never lets peek cover the trip chips (peek stays below available height)', () => {
    const [peek, mid, full] = planSheetSnapPoints(180);
    expect(full).toBe(180);
    expect(peek).toBeLessThan(mid);
    expect(mid).toBeLessThanOrEqual(full);
    expect(peek).toBeLessThanOrEqual(full);
  });
});

describe('planSheetChromeLayout', () => {
  it('sizes full snap to the gap below trip chips/search and above the tab bar', () => {
    const layout = planSheetChromeLayout({
      windowHeight: 800,
      sheetTopInset: 170,
      safeBottom: 34,
    });
    expect(PLAN_NAV_BAR_OFFSET).toBe(56);
    expect(layout.bottomInset).toBe(90);
    expect(layout.availableHeight).toBe(540);
    expect(layout.snapPoints).toEqual(planSheetSnapPoints(540));
    expect(layout.snapPoints[2]).toBe(540);
  });

  it('gives the stop-settings sheet the same snaps as the timeline sheet', () => {
    const input = { windowHeight: 780, sheetTopInset: 162, safeBottom: 12 };
    const timeline = planSheetChromeLayout(input);
    const settings = planSheetChromeLayout(input);
    expect(settings.snapPoints).toEqual(timeline.snapPoints);
    expect(settings.bottomInset).toBe(timeline.bottomInset);
  });
});

describe('planStopSettingsSheetIndex', () => {
  it('stays closed at -1 and opens at mid so the form is usable', () => {
    expect(PLAN_SHEET_CLOSED_INDEX).toBe(-1);
    expect(planStopSettingsSheetIndex(false)).toBe(PLAN_SHEET_CLOSED_INDEX);
    expect(planStopSettingsSheetIndex(true)).toBe(PLAN_SHEET_MID_INDEX);
  });
});

describe('planStopDetailVisible', () => {
  it('is hidden when the stop is missing even if an id is still set (stale close)', () => {
    expect(planStopDetailVisible({ detailStopId: 's1', stop: null })).toBe(false);
    expect(
      planStopDetailVisible({ detailStopId: 's1', stop: { id: 's1' } }),
    ).toBe(true);
    expect(
      planStopDetailVisible({ detailStopId: null, stop: { id: 's1' } }),
    ).toBe(false);
  });
});

describe('PLAN_STOP_CARD_BORDER_WIDTH', () => {
  it('is bolder than hairline so place cards read as distinct rows', () => {
    expect(PLAN_STOP_CARD_BORDER_WIDTH).toBeGreaterThanOrEqual(2);
    expect(PLAN_STOP_CARD_BORDER_WIDTH).toBeLessThanOrEqual(2.5);
  });
});

describe('planSheetVisibleHeight', () => {
  it('is the sheet container height minus position-from-top (peek is not full)', () => {
    const container = 700;
    const peekHeight = 220;
    const peekPosition = container - peekHeight;
    expect(planSheetVisibleHeight(container, peekPosition)).toBe(220);
    expect(planSheetVisibleHeight(container, peekPosition)).toBeLessThan(container);
  });

  it('matches full snap when the sheet is extended', () => {
    expect(planSheetVisibleHeight(700, 0)).toBe(700);
  });
});

describe('planSheetListViewportHeight', () => {
  it('gives the list a real viewport inside the visible snap, not the full sheet', () => {
    const peek = 220;
    const full = 530;
    const chrome = 118;
    const peekViewport = planSheetListViewportHeight(peek, chrome);
    expect(peekViewport).toBe(102);
    expect(peekViewport).toBeGreaterThan(0);
    expect(peekViewport).toBeLessThan(planSheetListViewportHeight(full, chrome));
  });

  it('does not go negative when chrome is taller than the snap', () => {
    expect(planSheetListViewportHeight(96, 140)).toBe(0);
  });
});

describe('planSheetGesturePolicy', () => {
  it('at peek, unlocks list scroll and pans the sheet from the handle only', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: 0,
      dragging: false,
      gesturesEnabled: true,
    });
    expect(policy.enableContentPanningGesture).toBe(false);
    expect(policy.enableHandlePanningGesture).toBe(true);
    expect(policy.canDragReorder).toBe(false);
    expect(policy.listKind).toBe('sheet-scroll');
  });

  it('at mid, allows long-press reorder on the draggable host', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_MID_INDEX,
      dragging: false,
      gesturesEnabled: true,
    });
    expect(policy.enableContentPanningGesture).toBe(false);
    expect(policy.enableHandlePanningGesture).toBe(true);
    expect(policy.listKind).toBe('draggable');
    expect(policy.canDragReorder).toBe(true);
  });

  it('keeps the draggable host at mid/full when settings overlay disables gestures', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_MID_INDEX,
      dragging: false,
      gesturesEnabled: false,
    });
    expect(policy.canDragReorder).toBe(false);
    expect(policy.listKind).toBe('draggable');
  });

  it('at full, allows reorder while keeping inner scroll unlocked', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_FULL_INDEX,
      dragging: false,
      gesturesEnabled: true,
    });
    expect(policy.enableContentPanningGesture).toBe(false);
    expect(policy.enableHandlePanningGesture).toBe(true);
    expect(policy.canDragReorder).toBe(true);
    expect(policy.listKind).toBe('draggable');
  });

  it('locks sheet handle pan while a row is being dragged', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_FULL_INDEX,
      dragging: true,
      gesturesEnabled: true,
    });
    expect(policy.enableHandlePanningGesture).toBe(false);
    expect(policy.enableContentPanningGesture).toBe(false);
  });

  it('disables sheet gestures when Plan is not the active tab or search is open', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: 0,
      dragging: false,
      gesturesEnabled: false,
    });
    expect(policy.enableHandlePanningGesture).toBe(false);
    expect(policy.enableContentPanningGesture).toBe(false);
  });
});

describe('wantedPlanSheetHost', () => {
  it('ignores Overview / day / ideas so chip taps cannot remount the sheet list', () => {
    const peek = planSheetGesturePolicy({
      sheetIndex: 0,
      dragging: false,
      gesturesEnabled: true,
    });
    const hosts = (['day', 'overview', 'ideas'] as const).map((tabKind) =>
      wantedPlanSheetHost({ tabKind, listKind: peek.listKind }),
    );
    expect(new Set(hosts).size).toBe(1);
    expect(hosts[0]).toBe('sheet-scroll');
  });

  it('still uses the draggable host at mid and full for every tab', () => {
    const mid = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_MID_INDEX,
      dragging: false,
      gesturesEnabled: true,
    });
    const full = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_FULL_INDEX,
      dragging: false,
      gesturesEnabled: true,
    });
    expect(wantedPlanSheetHost({ tabKind: 'overview', listKind: mid.listKind })).toBe(
      'draggable',
    );
    expect(wantedPlanSheetHost({ tabKind: 'day', listKind: full.listKind })).toBe(
      'draggable',
    );
  });
});

describe('samePlanSheetTab', () => {
  it('treats a repeated chip tap as a no-op', () => {
    expect(
      samePlanSheetTab({ kind: 'day', dayId: 'd1' }, { kind: 'day', dayId: 'd1' }),
    ).toBe(true);
    expect(samePlanSheetTab({ kind: 'overview' }, { kind: 'overview' })).toBe(true);
    expect(
      samePlanSheetTab({ kind: 'day', dayId: 'd1' }, { kind: 'day', dayId: 'd2' }),
    ).toBe(false);
    expect(samePlanSheetTab({ kind: 'day', dayId: 'd1' }, { kind: 'overview' })).toBe(
      false,
    );
  });
});

describe('resolvePlanSheetHost', () => {
  it('uses sheet-scroll or draggable from the wanted view', () => {
    expect(
      resolvePlanSheetHost({
        wanted: 'sheet-scroll',
        current: 'draggable',
        dragging: false,
      }),
    ).toBe('sheet-scroll');
    expect(
      resolvePlanSheetHost({
        wanted: 'draggable',
        current: 'sheet-scroll',
        dragging: false,
      }),
    ).toBe('draggable');
  });

  it('keeps the current host while a row is being dragged so RNGH is not torn down', () => {
    expect(
      resolvePlanSheetHost({
        wanted: 'sheet-scroll',
        current: 'draggable',
        dragging: true,
      }),
    ).toBe('draggable');
  });

  it('falls back to wanted when there is no current host yet', () => {
    expect(
      resolvePlanSheetHost({
        wanted: 'sheet-scroll',
        current: null,
        dragging: true,
      }),
    ).toBe('sheet-scroll');
  });

  it('debounces host remounts long enough for a snap/chip gesture to finish', () => {
    expect(PLAN_HOST_SWAP_DEBOUNCE_MS).toBeGreaterThanOrEqual(150);
    expect(PLAN_HOST_SWAP_DEBOUNCE_MS).toBeLessThanOrEqual(400);
  });
});

describe('planSettingsSheetCommandIndex', () => {
  it('drives Gorhom index from openRequested so dismiss actually changes the prop', () => {
    expect(planSettingsSheetCommandIndex(false)).toBe(PLAN_SHEET_CLOSED_INDEX);
    expect(planSettingsSheetCommandIndex(true)).toBe(PLAN_SHEET_MID_INDEX);
    expect(planSettingsSheetCommandIndex(false)).not.toBe(
      planSettingsSheetCommandIndex(true),
    );
  });
});

describe('planSettingsSheetInteractive', () => {
  it('is interactive as soon as open is requested, even before Gorhom onChange', () => {
    expect(
      planSettingsSheetInteractive({
        openRequested: true,
        sheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBe(true);
  });

  it('stays interactive after dismiss until onChange(-1) so a ghost can still close', () => {
    expect(
      planSettingsSheetInteractive({
        openRequested: false,
        sheetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe(true);
  });

  it('is inert only when closed and Gorhom reports -1', () => {
    expect(
      planSettingsSheetInteractive({
        openRequested: false,
        sheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBe(false);
  });
});

describe('planSettingsPointerEvents', () => {
  it('does not use pointerEvents none while the sheet is visually opening at index 1', () => {
    expect(
      planSettingsPointerEvents({
        openRequested: true,
        sheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBe('box-none');
    expect(
      planSettingsPointerEvents({
        openRequested: true,
        sheetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe('box-none');
  });

  it('blocks hits only after dismiss and onChange(-1)', () => {
    expect(
      planSettingsPointerEvents({
        openRequested: false,
        sheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBe('none');
    expect(
      planSettingsPointerEvents({
        openRequested: false,
        sheetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe('box-none');
    expect(
      planSettingsPointerEvents({
        openRequested: false,
        sheetIndex: 0,
      }),
    ).toBe('box-none');
  });
});

describe('planSettingsGesturePolicy', () => {
  it('enables handle drag and pan-down-to-close on open, before onChange', () => {
    const opening = planSettingsGesturePolicy({
      openRequested: true,
      sheetIndex: PLAN_SHEET_CLOSED_INDEX,
    });
    expect(opening.enableHandlePanningGesture).toBe(true);
    expect(opening.enablePanDownToClose).toBe(true);
    expect(opening.enableContentPanningGesture).toBe(false);
  });

  it('keeps inner scroll unlocked while the handle pans the sheet', () => {
    const open = planSettingsGesturePolicy({
      openRequested: true,
      sheetIndex: PLAN_SHEET_MID_INDEX,
    });
    expect(open.enableContentPanningGesture).toBe(false);
    expect(open.enableHandlePanningGesture).toBe(true);
  });

  it('releases gestures only when closed at -1 so the timeline can take over', () => {
    const closed = planSettingsGesturePolicy({
      openRequested: false,
      sheetIndex: PLAN_SHEET_CLOSED_INDEX,
    });
    expect(closed.enableHandlePanningGesture).toBe(false);
    expect(closed.enablePanDownToClose).toBe(false);
    expect(closed.enableContentPanningGesture).toBe(false);
  });
});

describe('planSheetCanInvoke', () => {
  it('refuses snapToIndex/close after unmount', () => {
    expect(planSheetCanInvoke(true)).toBe(true);
    expect(planSheetCanInvoke(false)).toBe(false);
  });
});

describe('planSheetNeedsSnap / planSheetNeedsClose', () => {
  it('does not snap when already at the target or unmounted', () => {
    expect(
      planSheetNeedsSnap({
        mounted: true,
        openRequested: true,
        currentIndex: PLAN_SHEET_MID_INDEX,
        targetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe(false);
    expect(
      planSheetNeedsSnap({
        mounted: false,
        openRequested: true,
        currentIndex: PLAN_SHEET_CLOSED_INDEX,
        targetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe(false);
    expect(
      planSheetNeedsSnap({
        mounted: true,
        openRequested: true,
        currentIndex: PLAN_SHEET_CLOSED_INDEX,
        targetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe(true);
  });

  it('closes only when still attached after dismiss was requested', () => {
    expect(
      planSheetNeedsClose({
        mounted: true,
        openRequested: false,
        currentIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe(true);
    expect(
      planSheetNeedsClose({
        mounted: true,
        openRequested: false,
        currentIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBe(false);
    expect(
      planSheetNeedsClose({
        mounted: false,
        openRequested: false,
        currentIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBe(false);
  });
});

describe('resolvePendingTripSwap', () => {
  it('swaps immediately when settings are fully dismissed', () => {
    expect(
      resolvePendingTripSwap({
        requestedTripId: 'b',
        currentTripId: 'a',
        settingsSheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toEqual({ activeTripId: 'b', pendingTripId: null });
  });

  it('holds the current trip until onChange(-1) when settings are still attached', () => {
    expect(
      resolvePendingTripSwap({
        requestedTripId: 'b',
        currentTripId: 'a',
        settingsSheetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toEqual({ activeTripId: 'a', pendingTripId: 'b' });
  });

  it('is a no-op when the same trip is tapped again', () => {
    expect(
      resolvePendingTripSwap({
        requestedTripId: 'a',
        currentTripId: 'a',
        settingsSheetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toEqual({ activeTripId: 'a', pendingTripId: null });
  });
});

describe('consumePendingTripAfterDismiss', () => {
  it('applies the pending trip only after the settings sheet reports -1', () => {
    expect(
      consumePendingTripAfterDismiss({
        pendingTripId: 'b',
        settingsSheetIndex: PLAN_SHEET_MID_INDEX,
      }),
    ).toBeNull();
    expect(
      consumePendingTripAfterDismiss({
        pendingTripId: 'b',
        settingsSheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBe('b');
    expect(
      consumePendingTripAfterDismiss({
        pendingTripId: null,
        settingsSheetIndex: PLAN_SHEET_CLOSED_INDEX,
      }),
    ).toBeNull();
  });
});

describe('planTimelineBodyKind / resolvePlanTimelineBody', () => {
  it('keeps the list body mounted across loading so Gorhom hosts are not torn down', () => {
    expect(planTimelineBodyKind({ hasTrip: true, isError: false })).toBe('list');
    expect(planTimelineBodyKind({ hasTrip: false, isError: false })).toBe(
      'loading',
    );
    expect(planTimelineBodyKind({ hasTrip: false, isError: true })).toBe('error');
    expect(
      resolvePlanTimelineBody({ current: 'list', wanted: 'loading' }),
    ).toBe('list');
    expect(resolvePlanTimelineBody({ current: 'list', wanted: 'error' })).toBe(
      'error',
    );
    expect(resolvePlanTimelineBody({ current: null, wanted: 'loading' })).toBe(
      'loading',
    );
  });
});

describe('PLAN_SHEET_SNAP_DEBOUNCE_MS', () => {
  it('waits out list remount + camera fit before snapping or swapping trips', () => {
    expect(PLAN_SHEET_SNAP_DEBOUNCE_MS).toBeGreaterThanOrEqual(
      PLAN_HOST_SWAP_DEBOUNCE_MS,
    );
    expect(PLAN_SHEET_SNAP_DEBOUNCE_MS).toBeLessThanOrEqual(500);
  });
});
