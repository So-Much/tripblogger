import { sign } from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';
import { verifySocketAccessToken } from './verify-socket-token';

describe('verifySocketAccessToken', () => {
  it('accepts an HS256 access token when no public key is configured', () => {
    const token = sign({ sub: 'user-1' }, 'secret-at-least-16', { algorithm: 'HS256' });
    expect(verifySocketAccessToken(token, 'secret-at-least-16')).toEqual({ sub: 'user-1' });
  });

  it('accepts an RS256 access token with the matching public key', () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const token = sign({ sub: 'user-2' }, privateKey, { algorithm: 'RS256' });
    expect(verifySocketAccessToken(token, 'unused-hs-secret', publicKey.export({ type: 'spki', format: 'pem' }).toString())).toEqual({
      sub: 'user-2',
    });
  });

  it('rejects a token signed with the wrong key', () => {
    const token = sign({ sub: 'user-1' }, 'other-secret-value', { algorithm: 'HS256' });
    expect(verifySocketAccessToken(token, 'secret-at-least-16')).toBeNull();
  });
});
