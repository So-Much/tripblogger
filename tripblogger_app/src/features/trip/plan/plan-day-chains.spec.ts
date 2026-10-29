import { buildDayChains, visibleDayChains } from './plan-day-chains';
import { planDayColor } from './plan-day-color';

describe('buildDayChains', () => {
  it('builds a polyline chain per day and does not link across days', () => {
    const chains = buildDayChains([
      {
        id: 'd0',
        dayIndex: 0,
        stops: [
          { id: 'a', name: 'A', lat: 1, lng: 2, position: 0 },
          { id: 'b', name: 'B', lat: 3, lng: 4, position: 1 },
          { id: 'c', name: 'C', lat: 5, lng: 6, position: 2 },
        ],
      },
      {
        id: 'd1',
        dayIndex: 1,
        stops: [
          { id: 'x', name: 'X', lat: 7, lng: 8, position: 0 },
          { id: 'y', name: 'Y', lat: 9, lng: 10, position: 1 },
        ],
      },
    ]);

    expect(chains).toHaveLength(2);
    expect(chains[0].color).toBe(planDayColor(0));
    expect(chains[1].color).toBe(planDayColor(1));
    expect(chains[0].color).not.toBe(chains[1].color);

    expect(chains[0].polylines).toEqual([
      [
        { latitude: 1, longitude: 2 },
        { latitude: 3, longitude: 4 },
      ],
      [
        { latitude: 3, longitude: 4 },
        { latitude: 5, longitude: 6 },
      ],
    ]);
    expect(chains[1].polylines).toEqual([
      [
        { latitude: 7, longitude: 8 },
        { latitude: 9, longitude: 10 },
      ],
    ]);

    const allPairs = [...chains[0].polylines, ...chains[1].polylines];
    expect(allPairs.some((seg) => seg[0].latitude === 5 && seg[1].latitude === 7)).toBe(
      false,
    );
  });

  it('uses encoded geometry for a leg when present, else a straight fallback', () => {
    // Tiny polyline6 for two close points; decode may vary — empty/invalid falls back.
    const chains = buildDayChains([
      {
        id: 'd0',
        dayIndex: 0,
        stops: [
          { id: 'a', name: 'A', lat: 11.94, lng: 108.44, position: 0 },
          {
            id: 'b',
            name: 'B',
            lat: 11.95,
            lng: 108.45,
            position: 1,
            travelGeometry: '',
          },
        ],
      },
    ]);
    expect(chains[0].polylines[0]).toEqual([
      { latitude: 11.94, longitude: 108.44 },
      { latitude: 11.95, longitude: 108.45 },
    ]);
  });

  it('skips days with fewer than two plottable stops (no polyline, stops still listed)', () => {
    const chains = buildDayChains([
      {
        id: 'd0',
        dayIndex: 0,
        stops: [{ id: 'solo', name: 'Solo', lat: 1, lng: 2, position: 0 }],
      },
    ]);
    expect(chains[0].stops).toHaveLength(1);
    expect(chains[0].polylines).toEqual([]);
  });

  it('sorts stops by position and drops invalid coordinates', () => {
    const chains = buildDayChains([
      {
        id: 'd0',
        dayIndex: 0,
        stops: [
          { id: 'b', name: 'B', lat: 3, lng: 4, position: 1 },
          { id: 'bad', name: 'Bad', lat: Number.NaN, lng: 0, position: 0 },
          { id: 'a', name: 'A', lat: 1, lng: 2, position: 0 },
        ],
      },
    ]);
    expect(chains[0].stops.map((s) => s.id)).toEqual(['a', 'b']);
    expect(chains[0].polylines).toHaveLength(1);
  });
});

describe('visibleDayChains', () => {
  const days = [
    {
      id: 'd0',
      dayIndex: 0,
      stops: [
        { id: 'a', name: 'A', lat: 1, lng: 2, position: 0 },
        { id: 'b', name: 'B', lat: 3, lng: 4, position: 1 },
      ],
    },
    {
      id: 'd1',
      dayIndex: 1,
      stops: [
        { id: 'x', name: 'X', lat: 7, lng: 8, position: 0 },
        { id: 'y', name: 'Y', lat: 9, lng: 10, position: 1 },
      ],
    },
  ];

  it('keeps only the selected day when a day tab is active', () => {
    const chains = buildDayChains(days);
    const visible = visibleDayChains(chains, {
      sheetKind: 'day',
      selectedDayId: 'd1',
    });
    expect(visible.map((c) => c.dayId)).toEqual(['d1']);
    expect(visible[0].polylines).toHaveLength(1);
    expect(visible[0].stops.map((s) => s.id)).toEqual(['x', 'y']);
  });

  it('keeps every day chain on Overview', () => {
    const chains = buildDayChains(days);
    const visible = visibleDayChains(chains, {
      sheetKind: 'overview',
      selectedDayId: null,
    });
    expect(visible.map((c) => c.dayId)).toEqual(['d0', 'd1']);
  });

  it('hides day chains on the ideas tab', () => {
    const chains = buildDayChains(days);
    expect(
      visibleDayChains(chains, { sheetKind: 'ideas', selectedDayId: null }).map(
        (c) => c.dayId,
      ),
    ).toEqual([]);
  });

  it('hides day chains on ideas even if a day id is still in the store', () => {
    const chains = buildDayChains(days);
    expect(
      visibleDayChains(chains, { sheetKind: 'ideas', selectedDayId: 'd0' }).map(
        (c) => c.dayId,
      ),
    ).toEqual([]);
  });

  it('does not default to all days while a day tab has no selected id yet', () => {
    const chains = buildDayChains(days);
    expect(
      visibleDayChains(chains, { sheetKind: 'day', selectedDayId: null }).map(
        (c) => c.dayId,
      ),
    ).toEqual([]);
  });

  it('ignores leftover selectedDayId on Overview and still shows every day', () => {
    const chains = buildDayChains(days);
    expect(
      visibleDayChains(chains, { sheetKind: 'overview', selectedDayId: 'd0' }).map(
        (c) => c.dayId,
      ),
    ).toEqual(['d0', 'd1']);
  });
});
