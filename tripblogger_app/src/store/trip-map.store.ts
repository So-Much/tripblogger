import { create } from 'zustand';

type TripMapState = {
  selectedTripId: string | null;
  setSelectedTripId: (id: string | null) => void;
};

export const useTripMapStore = create<TripMapState>((set) => ({
  selectedTripId: null,
  setSelectedTripId: (id) => set({ selectedTripId: id }),
}));
