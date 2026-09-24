import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken, type Jwks } from '@tripblogger/auth';

@Injectable()
export class JwksAuthGuard implements CanActivate {
  private cachedJwks: Jwks | null = null;
  private cachedAt = 0;

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
    if (this.cachedJwks && Date.now() - this.cachedAt < 10 * 60 * 1000) return this.cachedJwks;
    try {
      const res = await fetch(url);
      if (!res.ok) return this.cachedJwks;
      this.cachedJwks = (await res.json()) as Jwks;
      this.cachedAt = Date.now();
      return this.cachedJwks;
    } catch {
      return this.cachedJwks;
    }
  }
}
