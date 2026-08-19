import { buildDayChains, visibleDayChains } from './plan-day-chains';
import {
  applyRouteGeometries,
  clearPlanRouteGeometryCache,
  collectPlanRouteLegs,
  encodedGeometryToChainPoints,
  fetchPlanRouteGeometries,
  planRouteCacheKey,
  planRouteSegmentKey,
} from './plan-route-geometry';

const days = [
  {
    id: 'd0',
    dayIndex: 0,
    stops: [
      {
        id: 'a',
        name: 'A',
        lat: 11.94,
        lng: 108.44,
        position: 0,
        travelModeOverride: null as 'car' | null,
      },
      {
        id: 'b',
        name: 'B',
        lat: 11.95,
        lng: 108.45,
        position: 1,
        travelModeOverride: 'bike' as const,
      },
    ],
  },
  {
    id: 'd1',
    dayIndex: 1,
    stops: [
      {
        id: 'x',
        name: 'X',
        lat: 12.0,
        lng: 109.0,
        position: 0,
        travelModeOverride: null as 'car' | null,
      },
      {
        id: 'y',
        name: 'Y',
        lat: 12.01,
        lng: 109.02,
        position: 1,
        travelModeOverride: null as 'car' | null,
      },
    ],
  },
];

describe('planRouteCacheKey', () => {
  it('rounds coords and maps motorbike to the car OSRM profile', () => {
    expect(
      planRouteCacheKey('motorbike', { lat: 11.94004, lng: 108.44004 }, { lat: 11.95, lng: 108.45 }),
    ).toBe(planRouteCacheKey('car', { lat: 11.94, lng: 108.44 }, { lat: 11.95, lng: 108.45 }));
  });
});

describe('collectPlanRouteLegs', () => {
  it('lists consecutive pairs for the selected day only', () => {
    const legs = collectPlanRouteLegs(days, 'car', {
      sheetKind: 'day',
      selectedDayId: 'd0',
    });
    expect(legs).toHaveLength(1);
    expect(legs[0].dayId).toBe('d0');
    expect(legs[0].segmentIndex).toBe(0);
    expect(legs[0].osrmMode).toBe('bike');
    expect(legs[0].cacheKey).toBe(
      planRouteCacheKey('bike', { lat: 11.94, lng: 108.44 }, { lat: 11.95, lng: 108.45 }),
    );
  });

  it('lists every day on Overview and none on Ideas', () => {
    expect(
      collectPlanRouteLegs(days, 'car', { sheetKind: 'overview', selectedDayId: null }),
    ).toHaveLength(2);
    expect(
      collectPlanRouteLegs(days, 'car', { sheetKind: 'ideas', selectedDayId: 'd0' }),
    ).toEqual([]);
  });

  it('does not collect while a day tab has no id yet', () => {
    expect(
      collectPlanRouteLegs(days, 'car', { sheetKind: 'day', selectedDayId: null }),
    ).toEqual([]);
  });
});

describe('encodedGeometryToChainPoints', () => {
  it('returns empty for blank / too-short geometry (no fake straight line)', () => {
    expect(encodedGeometryToChainPoints('')).toEqual([]);
    expect(encodedGeometryToChainPoints('   ')).toEqual([]);
  });
});

describe('applyRouteGeometries', () => {
  it('replaces the crow-fly segment with routed points when present', () => {
    const chains = buildDayChains(days);
    const routed = [
      { latitude: 11.941, longitude: 108.441 },
      { latitude: 11.943, longitude: 108.443 },
      { latitude: 11.95, longitude: 108.45 },
    ];
    const next = applyRouteGeometries(
      chains,
      new Map([[planRouteSegmentKey('d0', 0), routed]]),
    );
    expect(next[0].polylines[0]).toEqual(routed);
    expect(next[1].polylines[0]).toEqual(chains[1].polylines[0]);
  });

  it('keeps the straight fallback when that leg has no geometry yet', () => {
    const chains = buildDayChains(days);
    const next = applyRouteGeometries(chains, new Map());
    expect(next[0].polylines[0]).toEqual(chains[0].polylines[0]);
  });
});

describe('fetchPlanRouteGeometries', () => {
  it('stores decoded route geometry under the day segment key', async () => {
    clearPlanRouteGeometryCache();
    const legs = collectPlanRouteLegs(days, 'car', {
      sheetKind: 'day',
      selectedDayId: 'd0',
    });
    const routed = [
      { latitude: 11.941, longitude: 108.441 },
      { latitude: 11.95, longitude: 108.45 },
    ];
    const bySegment = await fetchPlanRouteGeometries(legs, async () => ({
      routes: [{ geometry: 'encoded-route' }],
    }), undefined, {
      decode: (encoded) => (encoded === 'encoded-route' ? routed : []),
    });
    expect(bySegment.get(planRouteSegmentKey('d0', 0))).toEqual(routed);
  });
});

describe('visibleDayChains still hide ideas', () => {
  it('does not draw day polylines on the ideas tab', () => {
    const chains = applyRouteGeometries(buildDayChains(days), new Map());
    expect(
      visibleDayChains(chains, { sheetKind: 'ideas', selectedDayId: null }),
    ).toEqual([]);
  });
});
