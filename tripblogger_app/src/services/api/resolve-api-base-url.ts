import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_DEV = 'http://localhost:3000/api';

function trimTrailingSlash(url: string) {
  return url.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Raw env / extra api base (may include localhost). */
export function getConfiguredApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL ?? extra?.apiBaseUrl;
  let raw = (fromEnv ?? DEFAULT_DEV).trim();
  if (!raw.includes('://')) {
    raw = `http://${raw}`;
  }
  return trimTrailingSlash(raw);
}

/**
 * Expo Go / simulator: localhost in API URL targets the phone, not your PC → Network Error.
 * In dev we rewrite localhost to Metro host IP (physical device) or 10.0.2.2 (Android emu).
 */
export function resolveApiBaseUrl(): string {
  const configured = getConfiguredApiBaseUrl();

  if (!__DEV__ || Platform.OS === 'web') {
    return configured;
  }

  let url: URL;
  try {
    url = new URL(configured.includes('://') ? configured : `http://${configured}`);
  } catch {
    return configured;
  }

  if (!isLocalHostname(url.hostname)) {
    return trimTrailingSlash(url.toString());
  }

  const hostUri = Constants.expoConfig?.hostUri;
  const metroHost = typeof hostUri === 'string' && hostUri.length > 0 ? hostUri.split(':')[0] : undefined;

  if (metroHost && !isLocalHostname(metroHost)) {
    url.hostname = metroHost;
    return trimTrailingSlash(url.toString());
  }

  if (Platform.OS === 'android') {
    url.hostname = '10.0.2.2';
    return trimTrailingSlash(url.toString());
  }

  return configured;
}
