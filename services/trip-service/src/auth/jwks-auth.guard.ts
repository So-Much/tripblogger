import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken, type Jwks } from '@tripblogger/auth';

@Injectable()
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
  private lastSuccessAt = 0;
  private readonly logger = new Logger(JwksAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException();
    const jwks = await this.loadJwks();
    try {
      req.user = await verifyAccessToken({
        token,
        jwks: jwks ?? undefined,
        hsSecret: this.config.get<string>('JWT_ACCESS_SECRET'),
        issuer: jwks?.keys.length ? 'tripblogger-core' : undefined,
      });
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async loadJwks(): Promise<Jwks | null> {
    const url = this.config.get<string>('CORE_JWKS_URL');
    if (!url) return null;

    const now = Date.now();
    const FRESH_TTL = 10 * 60 * 1000;
    const STALE_TTL = 30 * 60 * 1000;

    if (this.cachedJwks && now - this.cachedAt < FRESH_TTL) {
      return this.cachedJwks;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        this.logger.warn(`JWKS fetch returned ${res.status} from ${url}`);
        return this.returnStaleOrNull(now, STALE_TTL);
      }
      this.cachedJwks = (await res.json()) as Jwks;
      this.cachedAt = now;
      this.lastSuccessAt = now;
      this.logger.log(`JWKS refreshed successfully from ${url}`);
      return this.cachedJwks;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`JWKS fetch failed: ${msg}`);
      return this.returnStaleOrNull(now, STALE_TTL);
    } finally {
      clearTimeout(timer);
    }
  }

  private returnStaleOrNull(now: number, staleTtl: number): Jwks | null {
    if (this.cachedJwks && now - this.lastSuccessAt < staleTtl) {
      this.logger.warn('Using stale JWKS cache');
      return this.cachedJwks;
    }
    this.logger.error('JWKS cache too old and Core unreachable - failing auth');
    return null;
  }
}
