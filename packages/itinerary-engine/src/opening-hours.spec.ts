import { parseOpeningHours } from './opening-hours';

describe('parseOpeningHours', () => {
  it('returns known:false for null/empty', () => {
    expect(parseOpeningHours(null).known).toBe(false);
    expect(parseOpeningHours('').known).toBe(false);
  });

  it('returns known:false for unsupported syntax (no false warnings)', () => {
    expect(parseOpeningHours('Mo-Su sunrise-sunset').known).toBe(false);
    expect(parseOpeningHours('PH off; Mo-Fr 09:00-17:00').known).toBe(false);
  });

  it('handles 24/7', () => {
    const r = parseOpeningHours('24/7');
    expect(r.known).toBe(true);
    if (r.known) {
      expect(r.isOpenAt(new Date('2026-08-08T03:00:00+07:00'))).toBe(true);
    }
  });

  it('handles Mo-Fr single range', () => {
    const r = parseOpeningHours('Mo-Fr 08:00-17:00');
    expect(r.known).toBe(true);
    if (r.known) {
      // Saturday 2026-08-08
      expect(r.isOpenAt(new Date('2026-08-08T10:00:00+07:00'))).toBe(false);
      // Monday 2026-08-10
      expect(r.isOpenAt(new Date('2026-08-10T10:00:00+07:00'))).toBe(true);
      expect(r.isOpenAt(new Date('2026-08-10T18:00:00+07:00'))).toBe(false);
    }
  });

  it('handles multiple intervals and off', () => {
    const r = parseOpeningHours('Mo-Fr 08:00-12:00,13:30-18:00; Sa off');
    expect(r.known).toBe(true);
    if (r.known) {
      expect(r.isOpenAt(new Date('2026-08-10T12:30:00+07:00'))).toBe(false);
      expect(r.isOpenAt(new Date('2026-08-10T14:00:00+07:00'))).toBe(true);
      expect(r.isOpenAt(new Date('2026-08-08T14:00:00+07:00'))).toBe(false);
    }
  });
});
