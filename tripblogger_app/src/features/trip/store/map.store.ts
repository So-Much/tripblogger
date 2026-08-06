import { create } from 'zustand';
import type {
  CameraFollowMode,
  MapPlace,
  MapRouteResponse,
  PoiCategoryId,
  TravelMode,
  TripBottomTab,
} from '../types/map';

type SheetKind = 'none' | 'explore' | 'place' | 'directions' | 'search';

type MapUiState = {
  followMode: CameraFollowMode;
  bearing: number;
  selectedCategory: PoiCategoryId | null;
  selectedPlace: MapPlace | null;
  searchQuery: string;
  searchResults: MapPlace[];
  searchOpen: boolean;
  nearbyPlaces: MapPlace[];
  searchCenter: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number } | null;
  showSearchThisArea: boolean;
  activeSheet: SheetKind;
  exploreSnapIndex: number;
  bottomTab: TripBottomTab;
  directionsOrigin: MapPlace | null;
  directionsDestination: MapPlace | null;
  travelMode: TravelMode;
  routeResult: MapRouteResponse | null;
  selectedRouteIndex: number;
  mapStyleVariant: 'default' | 'dark';

  setFollowMode: (mode: CameraFollowMode) => void;
  cycleFollowMode: () => void;
  setBearing: (bearing: number) => void;
  setSelectedCategory: (id: PoiCategoryId | null) => void;
  setSelectedPlace: (place: MapPlace | null) => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (results: MapPlace[]) => void;
  setSearchOpen: (open: boolean) => void;
  setNearbyPlaces: (places: MapPlace[]) => void;
  setSearchCenter: (c: { lat: number; lng: number } | null) => void;
  setMapCenter: (c: { lat: number; lng: number } | null) => void;
  setShowSearchThisArea: (v: boolean) => void;
  setActiveSheet: (sheet: SheetKind) => void;
  setExploreSnapIndex: (i: number) => void;
  setBottomTab: (tab: TripBottomTab) => void;
  setDirectionsOrigin: (p: MapPlace | null) => void;
  setDirectionsDestination: (p: MapPlace | null) => void;
  setTravelMode: (m: TravelMode) => void;
  setRouteResult: (r: MapRouteResponse | null) => void;
  setSelectedRouteIndex: (i: number) => void;
  toggleMapStyle: () => void;
  openPlace: (place: MapPlace) => void;
  openDirectionsTo: (place: MapPlace) => void;
  clearRoute: () => void;
};

const FOLLOW_CYCLE: CameraFollowMode[] = ['free', 'follow', 'follow-heading'];

export const useMapStore = create<MapUiState>((set, get) => ({
  followMode: 'follow',
  bearing: 0,
  selectedCategory: null,
  selectedPlace: null,
  searchQuery: '',
  searchResults: [],
  searchOpen: false,
  nearbyPlaces: [],
  searchCenter: null,
  mapCenter: null,
  showSearchThisArea: false,
  activeSheet: 'explore',
  exploreSnapIndex: 0,
  bottomTab: 'explore',
  directionsOrigin: null,
  directionsDestination: null,
  travelMode: 'car',
  routeResult: null,
  selectedRouteIndex: 0,
  mapStyleVariant: 'default',

  setFollowMode: (followMode) => set({ followMode }),
  cycleFollowMode: () => {
    const cur = get().followMode;
    const next = FOLLOW_CYCLE[(FOLLOW_CYCLE.indexOf(cur) + 1) % FOLLOW_CYCLE.length];
    set({ followMode: next });
  },
  setBearing: (bearing) => set({ bearing }),
  setSelectedCategory: (selectedCategory) =>
    set({
      selectedCategory,
      activeSheet: selectedCategory ? 'explore' : get().activeSheet,
      exploreSnapIndex: selectedCategory ? Math.max(get().exploreSnapIndex, 1) : get().exploreSnapIndex,
    }),
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setNearbyPlaces: (nearbyPlaces) => set({ nearbyPlaces }),
  setSearchCenter: (searchCenter) => set({ searchCenter }),
  setMapCenter: (mapCenter) => set({ mapCenter }),
  setShowSearchThisArea: (showSearchThisArea) => set({ showSearchThisArea }),
  setActiveSheet: (activeSheet) => set({ activeSheet }),
  setExploreSnapIndex: (exploreSnapIndex) => set({ exploreSnapIndex }),
  setBottomTab: (bottomTab) => set({ bottomTab }),
  setDirectionsOrigin: (directionsOrigin) => set({ directionsOrigin }),
  setDirectionsDestination: (directionsDestination) => set({ directionsDestination }),
  setTravelMode: (travelMode) => set({ travelMode }),
  setRouteResult: (routeResult) => set({ routeResult, selectedRouteIndex: 0 }),
  setSelectedRouteIndex: (selectedRouteIndex) => set({ selectedRouteIndex }),
  toggleMapStyle: () =>
    set({ mapStyleVariant: get().mapStyleVariant === 'default' ? 'dark' : 'default' }),
  openPlace: (place) =>
    set({
      selectedPlace: place,
      activeSheet: 'place',
      searchOpen: false,
      exploreSnapIndex: -1,
    }),
  openDirectionsTo: (place) =>
    set({
      directionsDestination: place,
      selectedPlace: place,
      activeSheet: 'directions',
      routeResult: null,
      exploreSnapIndex: -1,
    }),
  clearRoute: () =>
    set({
      routeResult: null,
      selectedRouteIndex: 0,
      directionsDestination: null,
      directionsOrigin: null,
    }),
}));
