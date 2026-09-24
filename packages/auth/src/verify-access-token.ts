import { createPublicKey } from 'crypto';
import jwt from 'jsonwebtoken';
import type { AccessTokenPayload, Jwks } from './types';

export type VerifyAccessTokenArgs = {
  token: string;
  jwks?: Jwks;
  hsSecret?: string;
  issuer?: string;
};

function payloadFromDecoded(decoded: jwt.JwtPayload): AccessTokenPayload {
  const statuses = Array.isArray(decoded.statuses)
    ? decoded.statuses.filter((s): s is string => typeof s === 'string')
    : [];
  return {
    sub: String(decoded.sub ?? ''),
    role: typeof decoded.role === 'string' ? decoded.role : '',
    statuses,
    iss: typeof decoded.iss === 'string' ? decoded.iss : undefined,
    kid: typeof decoded.kid === 'string' ? decoded.kid : undefined,
  };
}

function publicKeyFromJwk(jwk: JwkLike): string {
  const key = createPublicKey({
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
    },
    format: 'jwk',
  });
  return key.export({ type: 'spki', format: 'pem' }).toString();
}

type JwkLike = { kty: string; n?: string; e?: string; kid?: string };

function verifyRs256(token: string, jwks: Jwks, issuer?: string): AccessTokenPayload {
  const decodedHeader = jwt.decode(token, { complete: true });
  if (!decodedHeader || typeof decodedHeader === 'string') {
    throw new Error('invalid_token');
  }
  const kid = decodedHeader.header.kid;
  const jwk = kid ? jwks.keys.find((k) => k.kid === kid) : jwks.keys[0];
  if (!jwk?.n || !jwk.e) throw new Error('jwks_key_missing');
  const pem = publicKeyFromJwk(jwk);
  const decoded = jwt.verify(token, pem, {
    algorithms: ['RS256'],
    issuer,
  }) as jwt.JwtPayload;
  return payloadFromDecoded(decoded);
}

function verifyHs256(token: string, hsSecret: string, issuer?: string): AccessTokenPayload {
  const decoded = jwt.verify(token, hsSecret, {
    algorithms: ['HS256'],
    issuer,
  }) as jwt.JwtPayload;
  return payloadFromDecoded(decoded);
}

export async function verifyAccessToken(args: VerifyAccessTokenArgs): Promise<AccessTokenPayload> {
  const { token, jwks, hsSecret, issuer } = args;
  if (jwks?.keys?.length) {
    try {
      return verifyRs256(token, jwks, issuer);
    } catch (rsErr) {
      if (!hsSecret) throw rsErr;
    }
  }
  if (hsSecret) {
    return verifyHs256(token, hsSecret, issuer);
  }
  throw new Error('no_verifier');
}
