import { readFileSync } from 'fs';

const ISSUER = 'tripblogger-core';
const DEFAULT_KID = 'core-2026-09';

export function jwtIssuer(): string {
  return ISSUER;
}

export function jwtKid(): string {
  return process.env.JWT_ACCESS_KID || DEFAULT_KID;
}

/**
 * A configured but unreadable key must fail loudly: silently falling back to HS256 for signing
 * while verification still uses the RS256 public key rejects every token with 401.
 */
function readKey(inline: string | undefined, path: string | undefined, name: string): string | undefined {
  if (inline?.trim()) return inline;
  if (!path) return undefined;
  try {
    return readFileSync(path, 'utf8');
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`${name}=${path} is set but cannot be read (${reason}). Check the file permissions for the container user.`);
  }
}

export function loadAccessPrivateKey(): string | undefined {
  return readKey(process.env.JWT_ACCESS_PRIVATE_KEY, process.env.JWT_ACCESS_PRIVATE_KEY_PATH, 'JWT_ACCESS_PRIVATE_KEY_PATH');
}

export function loadAccessPublicKey(): string | undefined {
  return readKey(process.env.JWT_ACCESS_PUBLIC_KEY, process.env.JWT_ACCESS_PUBLIC_KEY_PATH, 'JWT_ACCESS_PUBLIC_KEY_PATH');
}
