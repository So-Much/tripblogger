import { readFileSync } from 'fs';

const ISSUER = 'tripblogger-core';
const DEFAULT_KID = 'core-2026-09';

export function jwtIssuer(): string {
  return ISSUER;
}

export function jwtKid(): string {
  return process.env.JWT_ACCESS_KID || DEFAULT_KID;
}

export function loadAccessPrivateKey(): string | undefined {
  if (process.env.JWT_ACCESS_PRIVATE_KEY?.trim()) return process.env.JWT_ACCESS_PRIVATE_KEY;
  const path = process.env.JWT_ACCESS_PRIVATE_KEY_PATH;
  if (!path) return undefined;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}

export function loadAccessPublicKey(): string | undefined {
  if (process.env.JWT_ACCESS_PUBLIC_KEY?.trim()) return process.env.JWT_ACCESS_PUBLIC_KEY;
  const path = process.env.JWT_ACCESS_PUBLIC_KEY_PATH;
  if (!path) return undefined;
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return undefined;
  }
}
