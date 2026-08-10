import { create } from 'zustand';
import type {
  CameraFollowMode,
  MapPlace,
  MapRouteResponse,
  PoiCategoryId,
  TravelMode,
  TripBottomTab,
} from '../types/map';
import {
  buildCategoryChangePatch,
  buildCloseOverlayForCategoryChangePatch,
  MARKER_PAINT_FREEZE_MS,
} from './category-change';

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
  /**
   * Bumped whenever the nearby POI dataset is invalidated (tag change, new area, etc.).
   * In-flight fetches compare against this so late responses cannot write stale lists.
   */
  nearbyEpoch: number;
  /**
   * MapCanvas must not swap/remount custom Markers until this timestamp.
   * Set when closing place for a tag change so sheet settle finishes first.
   */
  markerPaintFreezeUntil: number;
  searchCenter: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number } | null;
  showSearchThisArea: boolean;
  activeSheet: SheetKind;
  exploreSnapIndex: number;
  /** Bumped when explore is intentionally opened/kept open (e.g. category chip). */
  sheetEpoch: number;
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
  /**
   * Phase-1 for tag change while place/directions is open: close overlay + freeze
   * marker paints without changing category yet. Returns true if a close was applied.
   */
  closeOverlayForCategoryChange: () => boolean;
  setSelectedPlace: (place: MapPlace | null) => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (results: MapPlace[]) => void;
  setSearchOpen: (open: boolean) => void;
  setNearbyPlaces: (places: MapPlace[]) => void;
  /**
   * Close place/directions and bump the nearby generation so in-flight fetches
   * are ignored. Keeps painted markers until the next successful fetch replaces them.
   */
  invalidateNearbyDataset: (opts?: { openExplore?: boolean }) => void;
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
  /** Leave place detail and restore explore without remount thrash / snap=-1. */
  closePlace: () => void;
  openDirectionsTo: (place: MapPlace, origin?: MapPlace | null) => void;
  /** Leave directions and return to place detail without racing mid-fetch/fit. */
  closeDirections: () => void;
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
  nearbyEpoch: 0,
  markerPaintFreezeUntil: 0,
  searchCenter: null,
  mapCenter: null,
  showSearchThisArea: false,
  activeSheet: 'explore',
  exploreSnapIndex: 0,
  sheetEpoch: 0,
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
  setSelectedCategory: (selectedCategory) => {
    const patch = buildCategoryChangePatch(get(), selectedCategory, Date.now());
    if (!patch) return;
    set(patch);
  },
  closeOverlayForCategoryChange: () => {
    const patch = buildCloseOverlayForCategoryChangePatch(get(), Date.now());
    if (!patch) return false;
    set(patch);
    return true;
  },
  setSelectedPlace: (selectedPlace) => set({ selectedPlace }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setNearbyPlaces: (nearbyPlaces) => set({ nearbyPlaces }),
  invalidateNearbyDataset: (opts) => {
    const s = get();
    const openExplore =
      opts?.openExplore === true ||
      s.activeSheet === 'place' ||
      s.activeSheet === 'directions';
    const now = Date.now();
    // Close place/directions + bump epoch, but keep painted markers until the
    // next fetch replaces them (empty→full remount crashes RN Maps).
    set({
      nearbyEpoch: s.nearbyEpoch + 1,
      selectedPlace: null,
      routeResult: null,
      selectedRouteIndex: 0,
      directionsDestination: null,
      directionsOrigin: null,
      markerPaintFreezeUntil: Math.max(
        s.markerPaintFreezeUntil,
        now + MARKER_PAINT_FREEZE_MS,
      ),
      ...(openExplore
        ? {
            activeSheet: 'explore' as const,
            exploreSnapIndex: Math.max(s.exploreSnapIndex, 1),
            sheetEpoch: s.sheetEpoch + 1,
          }
        : {}),
    });
  },
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
      // Keep exploreSnapIndex so ExploreSheet can stay mounted under the overlay.
      // Invalidate any in-flight explore dismiss animation.
      sheetEpoch: get().sheetEpoch + 1,
    }),
  closePlace: () => {
    const snap = get().exploreSnapIndex;
    set({
      selectedPlace: null,
      activeSheet: 'explore',
      // openPlace used to force -1; heal that so height sync / list stay consistent.
      exploreSnapIndex: snap < 0 ? 1 : snap,
      sheetEpoch: get().sheetEpoch + 1,
    });
  },
  openDirectionsTo: (place, origin) =>
    set({
      directionsDestination: place,
      selectedPlace: place,
      activeSheet: 'directions',
      routeResult: null,
      selectedRouteIndex: 0,
      // Keep explore snap; sheet is hidden via activeSheet, not destroyed.
      // Camera follow fights fitToCoordinates and feels frozen.
      followMode: 'free',
      // Set origin immediately when known so the route query can start without a paint delay.
      ...(origin
        ? { directionsOrigin: origin }
        : { directionsOrigin: null }),
      sheetEpoch: get().sheetEpoch + 1,
    }),
  closeDirections: () =>
    set({
      activeSheet: 'place',
      routeResult: null,
      selectedRouteIndex: 0,
      directionsDestination: null,
      directionsOrigin: null,
    }),
  clearRoute: () =>
    set({
      routeResult: null,
      selectedRouteIndex: 0,
      directionsDestination: null,
      directionsOrigin: null,
    }),
}));
