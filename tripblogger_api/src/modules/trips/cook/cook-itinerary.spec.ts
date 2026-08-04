import { cookItinerary, durationFor } from './cook-itinerary';

describe('cookItinerary', () => {
  const days = [
    { id: 'd1', dayNumber: 1, date: '2026-08-01' },
    { id: 'd2', dayNumber: 2, date: '2026-08-02' },
  ];
  const anchor = { lat: 11.94, lng: 108.44 };

  it('returns emptyPlan when no picks', () => {
    const result = cookItinerary({ days, picks: [], anchor });
    expect(result.emptyPlan).toBe(true);
    expect(result.blocks).toHaveLength(0);
  });

  it('packs nearby POIs into same day under capacity', () => {
    const result = cookItinerary({
      days,
      anchor,
      picks: [
        {
          locationId: 'a',
          lat: 11.94,
          lng: 108.44,
          slotType: 'POI',
          defaultDurationMin: 90,
          source: 'PICK',
        },
        {
          locationId: 'b',
          lat: 11.945,
          lng: 108.445,
          slotType: 'POI',
          defaultDurationMin: 90,
          source: 'PICK',
        },
      ],
    });
    expect(result.emptyPlan).toBe(false);
    const day1 = result.blocks.filter((b) => b.tripDayId === 'd1');
    expect(day1.length).toBeGreaterThanOrEqual(2);
  });

  it('overflows to unscheduled when capacity exceeded', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({
      locationId: `p${i}`,
      lat: 11.94 + i * 0.001,
      lng: 108.44,
      slotType: 'POI' as const,
      defaultDurationMin: 120,
      source: 'PICK' as const,
    }));
    const result = cookItinerary({
      days: [{ id: 'd1', dayNumber: 1, date: '2026-08-01' }],
      anchor,
      picks: many,
      dayCapacityMin: 480,
    });
    expect(result.unscheduled.length).toBeGreaterThan(0);
  });

  it('excludes DONE location ids from new packing', () => {
    const result = cookItinerary({
      days,
      anchor,
      picks: [
        {
          locationId: 'done-loc',
          lat: 11.94,
          lng: 108.44,
          slotType: 'POI',
          defaultDurationMin: 90,
          source: 'PICK',
        },
        {
          locationId: 'new-loc',
          lat: 11.95,
          lng: 108.45,
          slotType: 'FOOD',
          defaultDurationMin: 60,
          source: 'PICK',
        },
      ],
      doneBlocks: [
        { id: 'blk1', locationId: 'done-loc', tripDayId: 'd1', orderIndex: 0 },
      ],
    });
    const ids = result.blocks.map((b) => b.locationId);
    expect(ids).not.toContain('done-loc');
    expect(ids).toContain('new-loc');
  });
});

describe('durationFor', () => {
  it('uses defaults by slot type', () => {
    expect(durationFor('POI', null)).toBe(90);
    expect(durationFor('FOOD', null)).toBe(60);
    expect(durationFor('POI', 45)).toBe(45);
  });
});
