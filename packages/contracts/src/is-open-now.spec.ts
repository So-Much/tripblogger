import { isOpenNow } from './is-open-now';

describe('isOpenNow', () => {
  it('returns null when hours unknown', () => {
    expect(isOpenNow(null)).toBeNull();
    expect(isOpenNow('')).toBeNull();
    expect(isOpenNow('Mo-Su sunrise-sunset')).toBeNull();
  });

  it('returns true for 24/7', () => {
    expect(isOpenNow('24/7', new Date('2026-08-08T03:00:00+07:00'))).toBe(true);
  });

  it('returns false when outside weekday hours', () => {
    // 2026-08-08 is Saturday
    expect(isOpenNow('Mo-Fr 08:00-17:00', new Date('2026-08-08T10:00:00+07:00'))).toBe(false);
  });

  it('returns true when inside weekday hours', () => {
    // 2026-08-10 is Monday
    expect(isOpenNow('Mo-Fr 08:00-17:00', new Date('2026-08-10T10:00:00+07:00'))).toBe(true);
  });
});
