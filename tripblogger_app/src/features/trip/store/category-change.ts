import type { MapPlace, PoiCategoryId } from '../types/map';

type SheetKind = 'none' | 'explore' | 'place' | 'directions' | 'search';

/** Hold marker list swaps long enough for PlaceDetail hide + Explore spring. */
export const MARKER_PAINT_FREEZE_MS = 480;

export type CategoryChangeState = {
  selectedCategory: PoiCategoryId | null;
  nearbyPlaces: MapPlace[];
  nearbyEpoch: number;
  exploreSnapIndex: number;
  sheetEpoch: number;
  activeSheet: SheetKind;
  markerPaintFreezeUntil: number;
};

export type CategoryChangePatch = Partial<CategoryChangeState> & {
  selectedPlace: null;
  routeResult: null;
  selectedRouteIndex: 0;
  directionsDestination: null;
  directionsOrigin: null;
};

/**
 * Phase 1 when a place/directions overlay is open: close it and freeze map
 * marker paints BEFORE category/fetch churn. Returning null means no overlay
 * to close (caller may apply the category patch immediately).
 */
export function buildCloseOverlayForCategoryChangePatch(
  state: CategoryChangeState,
  now: number,
): CategoryChangePatch | null {
  if (state.activeSheet !== 'place' && state.activeSheet !== 'directions') {
    return null;
  }

  return {
    selectedPlace: null,
    routeResult: null,
    selectedRouteIndex: 0,
    directionsDestination: null,
    directionsOrigin: null,
    activeSheet: 'explore',
    exploreSnapIndex: Math.max(state.exploreSnapIndex, 1),
    sheetEpoch: state.sheetEpoch + 1,
    markerPaintFreezeUntil: Math.max(
      state.markerPaintFreezeUntil,
      now + MARKER_PAINT_FREEZE_MS,
    ),
  };
}

/**
 * Patch applied when the user toggles a POI category chip.
 *
 * Crash-critical:
 * - Do NOT clear `nearbyPlaces` to [] while swapping tags (empty→full custom
 *   Marker remounts crash react-native-maps, especially near sheet transitions).
 * - Freeze marker painting when leaving a place overlay so MapCanvas does not
 *   swap pins in the same window as PlaceDetail hide / Explore reappear.
 * - Avoid bumping `sheetEpoch` when explore is already showing (prevents a
 *   second spring after a phased close).
 */
export function buildCategoryChangePatch(
  state: CategoryChangeState,
  selectedCategory: PoiCategoryId | null,
  now: number = Date.now(),
): CategoryChangePatch | null {
  if (selectedCategory === state.selectedCategory) return null;

  const hadPlaceOverlay =
    state.activeSheet === 'place' || state.activeSheet === 'directions';
  const freezeMs = hadPlaceOverlay
    ? MARKER_PAINT_FREEZE_MS
    : Math.floor(MARKER_PAINT_FREEZE_MS / 2);

  return {
    selectedCategory,
    nearbyEpoch: state.nearbyEpoch + 1,
    // Only wipe pins when leaving category mode entirely.
    ...(selectedCategory == null ? { nearbyPlaces: [] as MapPlace[] } : {}),
    selectedPlace: null,
    routeResult: null,
    selectedRouteIndex: 0,
    directionsDestination: null,
    directionsOrigin: null,
    markerPaintFreezeUntil: Math.max(state.markerPaintFreezeUntil, now + freezeMs),
    ...(selectedCategory
      ? {
          activeSheet: 'explore' as const,
          exploreSnapIndex: Math.max(state.exploreSnapIndex, 1),
          ...(hadPlaceOverlay || state.activeSheet !== 'explore'
            ? { sheetEpoch: state.sheetEpoch + 1 }
            : {}),
        }
      : hadPlaceOverlay
        ? {
            activeSheet: 'explore' as const,
            exploreSnapIndex: Math.max(state.exploreSnapIndex, 0),
            sheetEpoch: state.sheetEpoch + 1,
          }
        : {}),
  };
}
