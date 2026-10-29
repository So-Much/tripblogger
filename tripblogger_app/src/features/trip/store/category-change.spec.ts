import {
  buildCategoryChangePatch,
  buildCloseOverlayForCategoryChangePatch,
  MARKER_PAINT_FREEZE_MS,
} from './category-change';
import type { MapPlace } from '../types/map';

const samplePlace = (id: string): MapPlace => ({
  id,
  name: id,
  address: null,
  lat: 1,
  lng: 2,
  category: 'restaurant',
  source: 'overpass',
  distanceM: 10,
  rating: null,
  reviewCount: null,
  openingHours: null,
});

describe('buildCategoryChangePatch', () => {
  it('returns null when category is unchanged', () => {
    const state = {
      selectedCategory: 'restaurant' as const,
      nearbyPlaces: [samplePlace('a')],
      nearbyEpoch: 1,
      exploreSnapIndex: 1,
      sheetEpoch: 0,
      activeSheet: 'place' as const,
      markerPaintFreezeUntil: 0,
    };
    expect(buildCategoryChangePatch(state, 'restaurant', 1_000)).toBeNull();
  });

  it('closes place overlay but keeps nearby markers when switching tags', () => {
    const places = [samplePlace('a'), samplePlace('b')];
    const state = {
      selectedCategory: 'restaurant' as const,
      nearbyPlaces: places,
      nearbyEpoch: 3,
      exploreSnapIndex: 1,
      sheetEpoch: 4,
      activeSheet: 'place' as const,
      markerPaintFreezeUntil: 0,
    };

    const patch = buildCategoryChangePatch(state, 'cafe', 10_000);
    expect(patch).not.toBeNull();
    expect(patch!.selectedCategory).toBe('cafe');
    expect(patch!.selectedPlace).toBeNull();
    expect(patch!.activeSheet).toBe('explore');
    expect(patch!.nearbyEpoch).toBe(4);
    expect(patch!.sheetEpoch).toBe(5);
    expect(patch!.markerPaintFreezeUntil).toBe(10_000 + MARKER_PAINT_FREEZE_MS);
    // Critical: markers must not be wiped on tag switch.
    expect(patch!).not.toHaveProperty('nearbyPlaces');
  });

  it('does not bump sheetEpoch when explore is already active (phased close)', () => {
    const state = {
      selectedCategory: 'restaurant' as const,
      nearbyPlaces: [samplePlace('a')],
      nearbyEpoch: 3,
      exploreSnapIndex: 1,
      sheetEpoch: 9,
      activeSheet: 'explore' as const,
      markerPaintFreezeUntil: 12_000,
    };
    const patch = buildCategoryChangePatch(state, 'cafe', 12_500);
    expect(patch!.sheetEpoch).toBeUndefined();
    expect(patch!.activeSheet).toBe('explore');
    expect(patch!.markerPaintFreezeUntil).toBeGreaterThanOrEqual(12_500);
  });

  it('clears nearby markers only when deselecting the category chip', () => {
    const state = {
      selectedCategory: 'restaurant' as const,
      nearbyPlaces: [samplePlace('a')],
      nearbyEpoch: 2,
      exploreSnapIndex: 1,
      sheetEpoch: 1,
      activeSheet: 'explore' as const,
      markerPaintFreezeUntil: 0,
    };
    const patch = buildCategoryChangePatch(state, null, 1_000);
    expect(patch!.nearbyPlaces).toEqual([]);
    expect(patch!.nearbyEpoch).toBe(3);
  });
});

describe('buildCloseOverlayForCategoryChangePatch', () => {
  it('returns null when no place/directions overlay is open', () => {
    const state = {
      selectedCategory: 'restaurant' as const,
      nearbyPlaces: [samplePlace('a')],
      nearbyEpoch: 1,
      exploreSnapIndex: 1,
      sheetEpoch: 2,
      activeSheet: 'explore' as const,
      markerPaintFreezeUntil: 0,
    };
    expect(buildCloseOverlayForCategoryChangePatch(state, 5_000)).toBeNull();
  });

  it('closes place and freezes marker paint without changing category', () => {
    const places = [samplePlace('a')];
    const state = {
      selectedCategory: 'restaurant' as const,
      nearbyPlaces: places,
      nearbyEpoch: 7,
      exploreSnapIndex: 0,
      sheetEpoch: 3,
      activeSheet: 'place' as const,
      markerPaintFreezeUntil: 0,
    };
    const patch = buildCloseOverlayForCategoryChangePatch(state, 20_000);
    expect(patch).not.toBeNull();
    expect(patch!.selectedPlace).toBeNull();
    expect(patch!.activeSheet).toBe('explore');
    expect(patch!.exploreSnapIndex).toBe(1);
    expect(patch!.sheetEpoch).toBe(4);
    expect(patch!.markerPaintFreezeUntil).toBe(20_000 + MARKER_PAINT_FREEZE_MS);
    expect(patch!).not.toHaveProperty('selectedCategory');
    expect(patch!).not.toHaveProperty('nearbyEpoch');
    expect(patch!).not.toHaveProperty('nearbyPlaces');
  });
});
