import { computeDepartNowDuration } from './plan-depart-now';

describe('computeDepartNowDuration', () => {
  it('uses elapsed minutes from startAt', () => {
    const now = new Date('2026-08-27T10:45:00+07:00');
    expect(
      computeDepartNowDuration(
        {
          durationMinutes: 90,
          schedule: {
            arriveAt: '2026-08-27T10:00:00+07:00',
            startAt: '2026-08-27T10:00:00+07:00',
            departAt: '2026-08-27T11:30:00+07:00',
            skipped: false,
          } as never,
        },
        now,
      ),
    ).toBe(45);
  });

  it('clamps to min when leaving before start', () => {
    const now = new Date('2026-08-27T09:50:00+07:00');
    expect(
      computeDepartNowDuration(
        {
          durationMinutes: 90,
          schedule: {
            arriveAt: '2026-08-27T10:00:00+07:00',
            startAt: '2026-08-27T10:00:00+07:00',
            departAt: null,
            skipped: false,
          } as never,
        },
        now,
        1,
      ),
    ).toBe(1);
  });
});
