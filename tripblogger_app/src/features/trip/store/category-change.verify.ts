/**
 * Lightweight assertions (no Jest in app package).
 * Run: npx tsx src/features/trip/store/category-change.verify.ts
 */
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

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

assert(
  buildCategoryChangePatch(
    {
      selectedCategory: 'restaurant',
      nearbyPlaces: [samplePlace('a')],
      nearbyEpoch: 1,
      exploreSnapIndex: 1,
      sheetEpoch: 0,
      activeSheet: 'place',
      markerPaintFreezeUntil: 0,
    },
    'restaurant',
    1000,
  ) === null,
  'unchanged category must be null',
);

const switchFromPlace = buildCategoryChangePatch(
  {
    selectedCategory: 'restaurant',
    nearbyPlaces: [samplePlace('a'), samplePlace('b')],
    nearbyEpoch: 3,
    exploreSnapIndex: 1,
    sheetEpoch: 4,
    activeSheet: 'place',
    markerPaintFreezeUntil: 0,
  },
  'cafe',
  10_000,
);
assert(switchFromPlace, 'switch patch required');
assert(switchFromPlace.nearbyEpoch === 4, 'epoch must bump');
assert(switchFromPlace.selectedPlace === null, 'place must close');
assert(switchFromPlace.activeSheet === 'explore', 'explore must reopen');
assert(
  switchFromPlace.markerPaintFreezeUntil === 10_000 + MARKER_PAINT_FREEZE_MS,
  'freeze must cover sheet settle',
);
assert(!('nearbyPlaces' in switchFromPlace), 'must keep markers on tag switch');

const phased = buildCategoryChangePatch(
  {
    selectedCategory: 'restaurant',
    nearbyPlaces: [samplePlace('a')],
    nearbyEpoch: 3,
    exploreSnapIndex: 1,
    sheetEpoch: 9,
    activeSheet: 'explore',
    markerPaintFreezeUntil: 12_000,
  },
  'cafe',
  12_500,
);
assert(phased, 'phased category patch required');
assert(!('sheetEpoch' in phased), 'must not double-spring explore');

assert(
  buildCloseOverlayForCategoryChangePatch(
    {
      selectedCategory: 'restaurant',
      nearbyPlaces: [samplePlace('a')],
      nearbyEpoch: 1,
      exploreSnapIndex: 1,
      sheetEpoch: 2,
      activeSheet: 'explore',
      markerPaintFreezeUntil: 0,
    },
    5000,
  ) === null,
  'no overlay → null close patch',
);

const close = buildCloseOverlayForCategoryChangePatch(
  {
    selectedCategory: 'restaurant',
    nearbyPlaces: [samplePlace('a')],
    nearbyEpoch: 7,
    exploreSnapIndex: 0,
    sheetEpoch: 3,
    activeSheet: 'place',
    markerPaintFreezeUntil: 0,
  },
  20_000,
);
assert(close, 'close patch required');
assert(close.activeSheet === 'explore', 'close must show explore');
assert(close.sheetEpoch === 4, 'close must bump sheet epoch');
assert(
  close.markerPaintFreezeUntil === 20_000 + MARKER_PAINT_FREEZE_MS,
  'close must freeze markers',
);
assert(!('selectedCategory' in close), 'close must not change category');
assert(!('nearbyEpoch' in close), 'close must not invalidate nearby yet');

const clear = buildCategoryChangePatch(
  {
    selectedCategory: 'restaurant',
    nearbyPlaces: [samplePlace('a')],
    nearbyEpoch: 2,
    exploreSnapIndex: 1,
    sheetEpoch: 1,
    activeSheet: 'explore',
    markerPaintFreezeUntil: 0,
  },
  null,
  1000,
);
assert(clear?.nearbyPlaces?.length === 0, 'deselect clears markers');

console.log('category-change.verify: all assertions passed');
