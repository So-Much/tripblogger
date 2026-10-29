import { AUTH_THROTTLE, HELMET_OPTIONS, THROTTLE_DEFAULT } from './http-security';

describe('HELMET_OPTIONS', () => {
  it('allows the Expo app to load /uploads from another origin', () => {
    expect(HELMET_OPTIONS.crossOriginResourcePolicy).toEqual({ policy: 'cross-origin' });
    expect(HELMET_OPTIONS.contentSecurityPolicy).toBe(false);
    expect(HELMET_OPTIONS.crossOriginEmbedderPolicy).toBe(false);
  });
});

describe('throttle presets', () => {
  it('caps general traffic at 100 requests per minute', () => {
    expect(THROTTLE_DEFAULT).toEqual({ ttl: 60_000, limit: 100 });
  });

  it('caps login/register/google tighter than the default', () => {
    expect(AUTH_THROTTLE.default.limit).toBeLessThan(THROTTLE_DEFAULT.limit);
    expect(AUTH_THROTTLE.default.ttl).toBe(60_000);
  });
});
