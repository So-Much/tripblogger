import {
  addDaysLocal,
  combineLocalDateTime,
  deriveRangeFromPreset,
  endDateFromTripDays,
  formatDateRangeDisplay,
  formatIsoDateDisplay,
  formatIsoDateTimeDisplay,
  formatTripDaysNights,
  isoDateLocal,
  parseIsoDateLocal,
  splitLocalDateTime,
  toHhmm,
  tripDayCount,
  tripNightCount,
  weekendRangeFrom,
} from './plan-create-dates';

describe('isoDateLocal / addDaysLocal', () => {
  it('formats local YYYY-MM-DD', () => {
    const d = new Date(2026, 7, 17); // Aug 17 2026 local
    expect(isoDateLocal(d)).toBe('2026-08-17');
  });

  it('adds calendar days without UTC shift surprises', () => {
    expect(addDaysLocal('2026-08-17', 2)).toBe('2026-08-19');
  });
});

describe('combineLocalDateTime / splitLocalDateTime / toHhmm', () => {
  it('merges date + time and splits back', () => {
    const combined = combineLocalDateTime('2026-08-17', '08:30');
    expect(isoDateLocal(combined)).toBe('2026-08-17');
    expect(toHhmm(combined)).toBe('08:30');
    expect(splitLocalDateTime(combined)).toEqual({
      startDate: '2026-08-17',
      defaultDayStartTime: '08:30',
    });
  });

  it('falls back to 08:00 when hhmm is invalid', () => {
    const combined = combineLocalDateTime('2026-08-17', 'xx');
    expect(toHhmm(combined)).toBe('08:00');
  });
});

describe('weekendRangeFrom', () => {
  it('Sat → Sat–Sun', () => {
    const sat = new Date(2026, 7, 15); // Sat
    expect(weekendRangeFrom(sat)).toEqual({
      startDate: '2026-08-15',
      endDate: '2026-08-16',
    });
  });

  it('Sun → one-day trip', () => {
    const sun = new Date(2026, 7, 16); // Sun
    expect(weekendRangeFrom(sun)).toEqual({
      startDate: '2026-08-16',
      endDate: '2026-08-16',
    });
  });

  it('Wed → upcoming Sat–Sun', () => {
    const wed = new Date(2026, 7, 12); // Wed
    expect(weekendRangeFrom(wed)).toEqual({
      startDate: '2026-08-15',
      endDate: '2026-08-16',
    });
  });
});

describe('deriveRangeFromPreset', () => {
  it('days2/3/4 keep duration from start', () => {
    expect(deriveRangeFromPreset('days2', '2026-08-17')).toEqual({
      startDate: '2026-08-17',
      endDate: '2026-08-18',
    });
    expect(deriveRangeFromPreset('days3', '2026-08-17')).toEqual({
      startDate: '2026-08-17',
      endDate: '2026-08-19',
    });
    expect(deriveRangeFromPreset('days4', '2026-08-17')).toEqual({
      startDate: '2026-08-17',
      endDate: '2026-08-20',
    });
  });

  it('weekend snaps via weekendRangeFrom(start)', () => {
    expect(deriveRangeFromPreset('weekend', '2026-08-12')).toEqual({
      startDate: '2026-08-15',
      endDate: '2026-08-16',
    });
  });

  it('custom clamps end >= start', () => {
    expect(deriveRangeFromPreset('custom', '2026-08-20', '2026-08-18')).toEqual({
      startDate: '2026-08-20',
      endDate: '2026-08-20',
    });
    expect(deriveRangeFromPreset('custom', '2026-08-17', '2026-08-19')).toEqual({
      startDate: '2026-08-17',
      endDate: '2026-08-19',
    });
  });
});

describe('tripDayCount / endDateFromTripDays', () => {
  it('maps inclusive day count ↔ endDate', () => {
    expect(endDateFromTripDays('2026-08-17', 1)).toBe('2026-08-17');
    expect(endDateFromTripDays('2026-08-17', 2)).toBe('2026-08-18');
    expect(endDateFromTripDays('2026-08-17', 3)).toBe('2026-08-19');
    expect(endDateFromTripDays('2026-08-17', 4)).toBe('2026-08-20');
    expect(tripDayCount('2026-08-17', '2026-08-17')).toBe(1);
    expect(tripDayCount('2026-08-17', '2026-08-18')).toBe(2);
    expect(tripDayCount('2026-08-17', '2026-08-19')).toBe(3);
  });

  it('clamps invalid day counts to at least 1', () => {
    expect(endDateFromTripDays('2026-08-17', 0)).toBe('2026-08-17');
    expect(endDateFromTripDays('2026-08-17', -2)).toBe('2026-08-17');
    expect(endDateFromTripDays('2026-08-17', 2.9)).toBe('2026-08-18');
  });
});

describe('tripNightCount', () => {
  it('is max(days - 1, 0) for inclusive calendar days', () => {
    expect(tripNightCount(1)).toBe(0);
    expect(tripNightCount(2)).toBe(1);
    expect(tripNightCount(3)).toBe(2);
    expect(tripNightCount(4)).toBe(3);
  });

  it('clamps invalid day counts like endDateFromTripDays', () => {
    expect(tripNightCount(0)).toBe(0);
    expect(tripNightCount(-2)).toBe(0);
    expect(tripNightCount(2.9)).toBe(1);
  });
});

describe('formatTripDaysNights', () => {
  it('shows Vietnamese ngày · đêm, including same-day trips', () => {
    expect(formatTripDaysNights(3, 'vi-VN')).toBe('3 ngày · 2 đêm');
    expect(formatTripDaysNights(1, 'vi')).toBe('1 ngày · 0 đêm');
  });

  it('shows English days · nights with plural units', () => {
    expect(formatTripDaysNights(3, 'en-US')).toBe('3 days · 2 nights');
    expect(formatTripDaysNights(1, 'en')).toBe('1 day · 0 nights');
    expect(formatTripDaysNights(2, 'en-US')).toBe('2 days · 1 night');
  });
});

describe('formatIsoDateDisplay / formatIsoDateTimeDisplay / formatDateRangeDisplay', () => {
  it('formats Vietnamese dates as dd/mm/yyyy, never mm/dd/yyyy', () => {
    expect(formatIsoDateDisplay('2026-08-18', 'vi-VN')).toBe('18/08/2026');
    expect(formatIsoDateDisplay('2026-01-05', 'vi')).toBe('05/01/2026');
  });

  it('formats Vietnamese date+time on one line as dd/mm/yyyy, hh:mm', () => {
    expect(formatIsoDateTimeDisplay('2026-08-18', '08:00', 'vi-VN')).toBe(
      '18/08/2026, 08:00',
    );
  });

  it('formats Vietnamese ranges as start – end in dd/mm/yyyy', () => {
    expect(formatDateRangeDisplay('2026-08-18', '2026-08-20', 'vi-VN')).toBe(
      '18/08/2026 – 20/08/2026',
    );
    expect(formatDateRangeDisplay('2026-08-18', '2026-08-18', 'vi-VN')).toBe(
      '18/08/2026',
    );
  });

  it('formats English dates day-first so month is unambiguous', () => {
    expect(formatIsoDateDisplay('2026-08-18', 'en-US')).toBe('18 Aug 2026');
    expect(formatIsoDateTimeDisplay('2026-08-18', '08:00', 'en-US')).toBe(
      '18 Aug 2026, 08:00',
    );
    expect(formatDateRangeDisplay('2026-08-18', '2026-08-20', 'en-US')).toBe(
      '18 Aug 2026 – 20 Aug 2026',
    );
  });
});
