import { create } from 'zustand';
import type { MapCheckpoint } from '@/src/types/trip-map';
import type { PlannerStop, TripPlannerFilters } from '@/src/types/trip-planner';

type TripPlannerState = {
  primary: MapCheckpoint | null;
  extraStops: PlannerStop[];
  filters: TripPlannerFilters;
  setPrimary: (cp: MapCheckpoint | null) => void;
  setExtraStops: (stops: PlannerStop[]) => void;
  setFilters: (filters: TripPlannerFilters) => void;
  clear: () => void;
  hasDraft: () => boolean;
};

export const useTripPlannerStore = create<TripPlannerState>((set, get) => ({
  primary: null,
  extraStops: [],
  filters: { sort: 'rating' },
  setPrimary: (cp) => set({ primary: cp }),
  setExtraStops: (stops) => set({ extraStops: stops }),
  setFilters: (filters) => set({ filters }),
  clear: () => set({ primary: null, extraStops: [], filters: { sort: 'rating' } }),
  hasDraft: () => {
    const s = get();
    return Boolean(s.primary) || s.extraStops.length > 0;
  },
}));
