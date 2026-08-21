import { create } from 'zustand';
import {
  PLAN_SHEET_CLOSED_INDEX,
  resolvePendingTripSwap,
} from '../plan/plan-sheet-layout';

export type PlanSheetKind = 'day' | 'ideas' | 'overview';

type PlanUiState = {
  /** Active trip for Plan tab + add-from-place. */
  activeTripId: string | null;
  /** Selected calendar day; null = idea bucket, overview, or unset. */
  selectedDayId: string | null;
  /** Which Plan sheet tab is showing. */
  sheetKind: PlanSheetKind;
  /** Map marker tap → PlanTimeline opens this stop's editor. */
  focusedStopId: string | null;
  /** List-row tap → MapCanvas one-shot fly to this stop (does not lock pan). */
  cameraFocusStop: { id: string; lat: number; lng: number; nonce: number } | null;
  /** After add-from-search: PlanTimeline should switch to this day. */
  revealDayId: string | null;
  /** Create-trip form is covering Plan; hide map search chrome. */
  createOverlayOpen: boolean;
  /** Live Gorhom index of the stop-settings sibling (-1 = dismissed). */
  settingsSheetIndex: number;
  /** Trip chip tapped while settings are still attached; applied after -1. */
  pendingTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  /** Switch trips, or stash the id until settings onChange(-1). */
  requestActiveTripId: (id: string) => void;
  setSettingsSheetIndex: (index: number) => void;
  setSelectedDayId: (id: string | null) => void;
  setSheetKind: (kind: PlanSheetKind) => void;
  /** Atomic sheetKind + day id so MapCanvas never sees a torn intermediate. */
  setPlanMapSelection: (sheetKind: PlanSheetKind, selectedDayId: string | null) => void;
  setFocusedStopId: (id: string | null) => void;
  setCameraFocusStop: (stop: { id: string; lat: number; lng: number } | null) => void;
  setRevealDayId: (id: string | null) => void;
  setCreateOverlayOpen: (open: boolean) => void;
};

function tripSwitchPatch(id: string | null) {
  return {
    activeTripId: id,
    pendingTripId: null,
    focusedStopId: null,
    cameraFocusStop: null,
    selectedDayId: null,
    sheetKind: 'day' as const,
    revealDayId: null,
  };
}

/**
 * Minimal plan UI state shared by PlanTab, PlaceDetailSheet add-flow,
 * and MapCanvas numbered stop markers.
 */
export const usePlanStore = create<PlanUiState>((set, get) => ({
  activeTripId: null,
  selectedDayId: null,
  sheetKind: 'day',
  focusedStopId: null,
  cameraFocusStop: null,
  revealDayId: null,
  createOverlayOpen: false,
  settingsSheetIndex: PLAN_SHEET_CLOSED_INDEX,
  pendingTripId: null,
  setActiveTripId: (id) => set(tripSwitchPatch(id)),
  requestActiveTripId: (id) => {
    const { activeTripId, settingsSheetIndex } = get();
    const resolved = resolvePendingTripSwap({
      requestedTripId: id,
      currentTripId: activeTripId,
      settingsSheetIndex,
    });
    if (resolved.pendingTripId) {
      set({ pendingTripId: resolved.pendingTripId });
      return;
    }
    set(tripSwitchPatch(resolved.activeTripId));
  },
  setSettingsSheetIndex: (settingsSheetIndex) => set({ settingsSheetIndex }),
  setSelectedDayId: (id) => set({ selectedDayId: id }),
  setSheetKind: (sheetKind) => set({ sheetKind }),
  setPlanMapSelection: (sheetKind, selectedDayId) => set({ sheetKind, selectedDayId }),
  setFocusedStopId: (focusedStopId) => set({ focusedStopId }),
  setCameraFocusStop: (stop) =>
    set({
      cameraFocusStop: stop
        ? { ...stop, nonce: (get().cameraFocusStop?.nonce ?? 0) + 1 }
        : null,
    }),
  setRevealDayId: (revealDayId) => set({ revealDayId }),
  setCreateOverlayOpen: (createOverlayOpen) => set({ createOverlayOpen }),
}));
