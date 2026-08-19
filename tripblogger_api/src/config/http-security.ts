/**
 * Helmet for a JSON API that also serves /uploads to the Expo app.
 * CSP/COEP stay off (we do not serve HTML documents).
 * CORP must be cross-origin so avatars/post images load on device.
 */
export const HELMET_OPTIONS = {
  contentSecurityPolicy: false as const,
  crossOriginEmbedderPolicy: false as const,
  crossOriginResourcePolicy: { policy: 'cross-origin' as const },
};

/** Global ceiling: 100 requests / 60s per IP. */
export const THROTTLE_DEFAULT = { ttl: 60_000, limit: 100 };

/** Login / register / Google — tighter than the global ceiling. */
export const AUTH_THROTTLE = {
  default: { ttl: 60_000, limit: 10 },
};
