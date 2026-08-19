import {
  PLAN_HOST_SWAP_DEBOUNCE_MS,
  PLAN_SHEET_FULL_INDEX,
  planSheetGesturePolicy,
  planSheetListViewportHeight,
  planSheetSnapPoints,
  planSheetVisibleHeight,
  resolvePlanSheetHost,
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

  it('at mid, still uses the sheet scrollable so later stops are reachable', () => {
    const policy = planSheetGesturePolicy({
      sheetIndex: 1,
      dragging: false,
      gesturesEnabled: true,
    });
    expect(policy.enableContentPanningGesture).toBe(false);
    expect(policy.listKind).toBe('sheet-scroll');
    expect(policy.canDragReorder).toBe(false);
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

  it('still uses the draggable host at full snap for every tab', () => {
    const full = planSheetGesturePolicy({
      sheetIndex: PLAN_SHEET_FULL_INDEX,
      dragging: false,
      gesturesEnabled: true,
    });
    expect(wantedPlanSheetHost({ tabKind: 'overview', listKind: full.listKind })).toBe(
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
