import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken, type Jwks } from '@tripblogger/auth';

const FRESH_TTL = 10 * 60 * 1000; // 10 minutes
const STALE_TTL = 30 * 60 * 1000; // 30 minutes
const REFRESH_COOLDOWN = 30 * 1000; // 30 seconds after a failed refresh

@Injectable()
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
  private lastSuccessAt = 0;
  private lastFailureAt = 0;
  private inflight: Promise<Jwks | null> | null = null;
  private readonly logger = new Logger(JwksAuthGuard.name);

  constructor(private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException();

    const jwksUrl = this.config.get<string>('CORE_JWKS_URL');
    const jwks = await this.loadJwks();

    // Auth mode:
    // - CORE_JWKS_URL set (microservice → Core): JWKS/RS256 only. If JWKS is missing or
    //   past the stale window, fail closed with 401. Do NOT pass JWT_ACCESS_SECRET — that
    //   would bypass fail-closed and let verifyAccessToken fall through to HS256 after an
    //   RS256 miss (algorithm confusion).
    // - CORE_JWKS_URL unset (legacy/dev): HS256 via JWT_ACCESS_SECRET, matching Core when
    //   it has no access private key configured.
    try {
      if (jwksUrl) {
        if (!jwks?.keys?.length) throw new UnauthorizedException();
        req.user = await verifyAccessToken({
          token,
          jwks,
          issuer: 'tripblogger-core',
        });
      } else {
        req.user = await verifyAccessToken({
          token,
          hsSecret: this.config.get<string>('JWT_ACCESS_SECRET'),
        });
      }
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private async loadJwks(): Promise<Jwks | null> {
    const url = this.config.get<string>('CORE_JWKS_URL');
    if (!url) return null;

    const now = Date.now();

    // Return fresh cache
    if (this.cachedJwks && now - this.cachedAt < FRESH_TTL) {
      return this.cachedJwks;
    }

    // After a failed refresh, skip further fetches for a short cooldown so concurrent
    // traffic does not stampede Core with 3s-timeout requests.
    if (this.lastFailureAt && now - this.lastFailureAt < REFRESH_COOLDOWN) {
      return this.returnStaleOrNull(now, STALE_TTL);
    }

    // Share a single in-flight refresh across concurrent callers.
    if (!this.inflight) {
      this.inflight = this.refreshJwks(url, now).finally(() => {
        this.inflight = null;
      });
    }
    return this.inflight;
  }

  private async refreshJwks(url: string, now: number): Promise<Jwks | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        this.logger.warn(`JWKS fetch returned ${res.status} from ${url}`);
        this.lastFailureAt = Date.now();
        return this.returnStaleOrNull(now, STALE_TTL);
      }
      try {
        this.cachedJwks = (await res.json()) as Jwks;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`JWKS parse error from ${url}: ${msg}`);
        this.lastFailureAt = Date.now();
        return this.returnStaleOrNull(now, STALE_TTL);
      }
      this.cachedAt = now;
      this.lastSuccessAt = now;
      this.lastFailureAt = 0;
      this.logger.log(`JWKS loaded from ${url}`);
      return this.cachedJwks;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const name = err instanceof Error ? err.name : '';
      if (name === 'AbortError') {
        this.logger.warn(`JWKS fetch failed: timeout after 3s (${msg})`);
      } else {
        this.logger.warn(`JWKS fetch failed: ${msg}`);
      }
      this.lastFailureAt = Date.now();
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
