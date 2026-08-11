import { create } from 'zustand';

type PlanUiState = {
  /** Active trip for Plan tab + add-from-place. */
  activeTripId: string | null;
  /** Selected calendar day; null = idea bucket or unset. */
  selectedDayId: string | null;
  setActiveTripId: (id: string | null) => void;
  setSelectedDayId: (id: string | null) => void;
};

/**
 * Minimal plan UI state shared by PlanTab, PlaceDetailSheet add-flow,
 * and MapCanvas numbered stop markers.
 */
export const usePlanStore = create<PlanUiState>((set) => ({
  activeTripId: null,
  selectedDayId: null,
  setActiveTripId: (id) => set({ activeTripId: id }),
  setSelectedDayId: (id) => set({ selectedDayId: id }),
}));
