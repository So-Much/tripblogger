import { computeDaySchedule } from './schedule';

const base = {
  bufferAfterMinutes: 15,
  travelFromPrevSeconds: 0,
  anchorTime: null as string | null,
  status: 'todo' as const,
  openingHoursRaw: null as string | null,
};

describe('computeDaySchedule', () => {
  it('chains duration + buffer', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10',
      dayStartTime: '08:00',
      stops: [
        { id: 'a', durationMinutes: 60, ...base, travelFromPrevSeconds: 0 },
        { id: 'b', durationMinutes: 30, ...base, travelFromPrevSeconds: 600 },
      ],
    });
    expect(r.stops[0].startAt).toContain('T08:00');
    expect(r.stops[0].endAt).toContain('T09:00');
    // depart 09:15 → travel 10m → arrive 09:25
    expect(r.stops[1].arriveAt).toContain('T09:25');
    expect(r.conflicts).toHaveLength(0);
  });

  it('waits when arriving early for anchor (idle)', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10',
      dayStartTime: '08:00',
      stops: [
        { id: 'a', durationMinutes: 30, ...base, travelFromPrevSeconds: 0 },
        {
          id: 'b',
          durationMinutes: 30,
          ...base,
          travelFromPrevSeconds: 0,
          bufferAfterMinutes: 0,
          anchorTime: '10:00',
        },
      ],
    });
    expect(r.stops[1].startAt).toContain('T10:00');
    expect(r.stops[1].idleMinutes).toBeGreaterThan(0);
  });

  it('emits anchor_unreachable with lateMinutes and does not push anchor', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10',
      dayStartTime: '08:00',
      stops: [
        {
          id: 'a',
          durationMinutes: 180,
          ...base,
          travelFromPrevSeconds: 0,
          bufferAfterMinutes: 0,
        },
        {
          id: 'b',
          durationMinutes: 30,
          ...base,
          travelFromPrevSeconds: 0,
          bufferAfterMinutes: 0,
          anchorTime: '09:00',
        },
      ],
    });
    expect(r.conflicts.some((c) => c.type === 'anchor_unreachable' && c.stopId === 'b')).toBe(true);
    const c = r.conflicts.find((c) => c.stopId === 'b')!;
    expect(c.lateMinutes).toBeGreaterThan(0);
    expect(r.stops[1].startAt).toContain('T11:00'); // starts when arrived, not 09:00
  });

  it('skips skipped stops without consuming time', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10',
      dayStartTime: '08:00',
      stops: [
        { id: 'a', durationMinutes: 60, ...base, status: 'skipped' },
        { id: 'b', durationMinutes: 30, ...base, travelFromPrevSeconds: 0 },
      ],
    });
    expect(r.stops[0].skipped).toBe(true);
    expect(r.stops[1].startAt).toContain('T08:00');
  });

  it('emits travel_unknown when travelFromPrevSeconds is null for non-first', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10',
      dayStartTime: '08:00',
      stops: [
        { id: 'a', durationMinutes: 30, ...base },
        { id: 'b', durationMinutes: 30, ...base, travelFromPrevSeconds: null },
      ],
    });
    expect(r.conflicts.some((c) => c.type === 'travel_unknown' && c.stopId === 'b')).toBe(true);
  });

  it('emits closed_on_arrival when parser knows closed', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10', // Monday
      dayStartTime: '20:00',
      stops: [
        {
          id: 'a',
          durationMinutes: 30,
          ...base,
          openingHoursRaw: 'Mo-Fr 08:00-17:00',
        },
      ],
    });
    expect(r.conflicts.some((c) => c.type === 'closed_on_arrival')).toBe(true);
  });

  it('does not warn when opening hours unknown', () => {
    const r = computeDaySchedule({
      dayDate: '2026-08-10',
      dayStartTime: '20:00',
      stops: [
        {
          id: 'a',
          durationMinutes: 30,
          ...base,
          openingHoursRaw: 'Mo-Su sunrise-sunset',
        },
      ],
    });
    expect(r.conflicts.filter((c) => c.type === 'closed_on_arrival')).toHaveLength(0);
  });
});
