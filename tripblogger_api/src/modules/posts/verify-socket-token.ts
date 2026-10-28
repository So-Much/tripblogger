import { verify, type JwtPayload } from 'jsonwebtoken';

/** Realtime uses the same access token as HTTP. RS256 when Core has a public key, otherwise HS256. */
export function verifySocketAccessToken(token: string, secret: string, publicKey?: string): { sub: string } | null {
  try {
    const payload = (
      publicKey
        ? verify(token, publicKey, { algorithms: ['RS256'] })
        : verify(token, secret, { algorithms: ['HS256'] })
    ) as JwtPayload;
    if (!payload?.sub) return null;
    return { sub: String(payload.sub) };
  } catch {
    return null;
  }
}
