import { generateKeyPairSync } from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyAccessToken } from './verify-access-token';

const HS_SECRET = 'test-hs-secret-at-least-16';

describe('verifyAccessToken', () => {
  it('verifies HS256 and returns sub/role/statuses', async () => {
    const token = jwt.sign(
      { sub: 'user-1', role: 'MEMBER', statuses: ['ACTIVE'] },
      HS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    );
    const payload = await verifyAccessToken({ token, hsSecret: HS_SECRET });
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('MEMBER');
    expect(payload.statuses).toEqual(['ACTIVE']);
  });

  it('verifies RS256 against a generated JWKS', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwk = publicKey.export({ format: 'jwk' });
    const token = jwt.sign(
      { sub: 'user-2', role: 'GUEST', statuses: ['ACTIVE'], iss: 'tripblogger-core' },
      privateKey,
      { algorithm: 'RS256', keyid: 'core-2026-09', expiresIn: '15m' },
    );
    const payload = await verifyAccessToken({
      token,
      jwks: { keys: [{ kty: 'RSA', kid: 'core-2026-09', n: jwk.n, e: jwk.e, alg: 'RS256', use: 'sig' }] },
      issuer: 'tripblogger-core',
    });
    expect(payload.sub).toBe('user-2');
    expect(payload.role).toBe('GUEST');
  });

  it('rejects expired HS256 tokens', async () => {
    const token = jwt.sign(
      { sub: 'x', role: 'MEMBER', statuses: ['ACTIVE'] },
      HS_SECRET,
      { algorithm: 'HS256', expiresIn: -10 },
    );
    await expect(verifyAccessToken({ token, hsSecret: HS_SECRET })).rejects.toThrow();
  });

  it('rejects wrong issuer', async () => {
    const token = jwt.sign(
      { sub: 'x', role: 'MEMBER', statuses: ['ACTIVE'], iss: 'other' },
      HS_SECRET,
      { algorithm: 'HS256', expiresIn: '15m' },
    );
    await expect(
      verifyAccessToken({ token, hsSecret: HS_SECRET, issuer: 'tripblogger-core' }),
    ).rejects.toThrow();
  });
});
