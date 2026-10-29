import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { createPublicKey } from 'crypto';
import { jwtKid, loadAccessPublicKey } from './jwt-keys';

@SkipThrottle()
@Controller('auth/.well-known')
export class JwksController {
  @Get('jwks.json')
  getJwks() {
    const pem = loadAccessPublicKey();
    if (!pem) return { keys: [] };
    const jwk = createPublicKey(pem).export({ format: 'jwk' });
    return {
      keys: [
        {
          kty: jwk.kty,
          kid: jwtKid(),
          use: 'sig',
          alg: 'RS256',
          n: jwk.n,
          e: jwk.e,
        },
      ],
    };
  }
}
