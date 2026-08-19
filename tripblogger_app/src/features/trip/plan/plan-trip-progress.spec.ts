import { isPlanTripInProgress, isWithinInclusiveTripDates } from './plan-trip-progress';

describe('isWithinInclusiveTripDates', () => {
  it('is true on start and end dates, false outside', () => {
    expect(isWithinInclusiveTripDates(new Date(2026, 7, 18), '2026-08-18', '2026-08-20')).toBe(
      true,
    );
    expect(isWithinInclusiveTripDates(new Date(2026, 7, 20, 23, 0), '2026-08-18', '2026-08-20')).toBe(
      true,
    );
    expect(isWithinInclusiveTripDates(new Date(2026, 7, 17), '2026-08-18', '2026-08-20')).toBe(
      false,
    );
    expect(isWithinInclusiveTripDates(new Date(2026, 7, 21), '2026-08-18', '2026-08-20')).toBe(
      false,
    );
  });
});

describe('isPlanTripInProgress', () => {
  const base = {
    now: new Date(2026, 7, 18, 10, 0),
    startDate: '2026-08-18',
    endDate: '2026-08-20',
    onPlanTab: true,
    tripSelected: true,
  };

  it('is in progress when Plan tab has the trip selected and today is inside the dates', () => {
    expect(isPlanTripInProgress(base)).toBe(true);
  });

  it('is not in progress off the Plan tab or with no trip selected', () => {
    expect(isPlanTripInProgress({ ...base, onPlanTab: false })).toBe(false);
    expect(isPlanTripInProgress({ ...base, tripSelected: false })).toBe(false);
  });

  it('is not in progress outside the trip dates', () => {
    expect(isPlanTripInProgress({ ...base, now: new Date(2026, 7, 10) })).toBe(false);
  });

  it('treats completed/archived trips as not in progress even inside the dates', () => {
    expect(isPlanTripInProgress({ ...base, status: 'completed' })).toBe(false);
    expect(isPlanTripInProgress({ ...base, status: 'archived' })).toBe(false);
  });

  it('treats draft trips inside the date window as in progress (no journey-activate flag)', () => {
    expect(isPlanTripInProgress({ ...base, status: 'draft' })).toBe(true);
    expect(isPlanTripInProgress({ ...base, status: 'active' })).toBe(true);
  });
});
