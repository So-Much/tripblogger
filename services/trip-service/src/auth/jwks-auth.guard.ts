import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken, type Jwks } from '@tripblogger/auth';

@Injectable()
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;
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
    if (this.cachedJwks && now - this.cachedAt < 10 * 60 * 1000) {
      return this.cachedJwks;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) {
        this.logger.warn(`JWKS fetch returned ${res.status} from ${url}`);
        return this.cachedJwks;
      }
      this.cachedJwks = (await res.json()) as Jwks;
      this.cachedAt = now;
      this.logger.log(`JWKS loaded from ${url}`);
      return this.cachedJwks;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`JWKS fetch failed: ${msg}`);
      return this.cachedJwks;
    } finally {
      clearTimeout(timer);
    }
  }
}
