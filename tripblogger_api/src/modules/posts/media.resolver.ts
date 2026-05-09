import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MediaResolver {
  constructor(private readonly configService: ConfigService) {}

  private sign(path: string, exp: string): string {
    const secret = this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
    return createHmac('sha256', secret).update(`${path}.${exp}`).digest('hex');
  }

  toPublicUrl(path: string, reqMeta: { protocol: string; host?: string; forwardedProto?: string }): string {
    const proto = reqMeta.forwardedProto ?? reqMeta.protocol ?? 'http';
    const host = reqMeta.host ?? 'localhost:3000';
    return `${proto}://${host}${path}`;
  }

  toPrivateSignedUrl(path: string, reqMeta: { protocol: string; host?: string; forwardedProto?: string }, ttlSec = 900): string {
    const exp = String(Math.floor(Date.now() / 1000) + ttlSec);
    const sig = this.sign(path, exp);
    const encodedPath = encodeURIComponent(path);
    const proto = reqMeta.forwardedProto ?? reqMeta.protocol ?? 'http';
    const host = reqMeta.host ?? 'localhost:3000';
    return `${proto}://${host}/api/posts/media/access?p=${encodedPath}&exp=${exp}&sig=${sig}`;
  }

  toPrivateSignedPath(path: string, ttlSec = 900): string {
    const exp = String(Math.floor(Date.now() / 1000) + ttlSec);
    const sig = this.sign(path, exp);
    return `/api/posts/media/access?p=${encodeURIComponent(path)}&exp=${exp}&sig=${sig}`;
  }

  verifySignedPath(path: string, exp: string, sig: string): void {
    const now = Math.floor(Date.now() / 1000);
    const expInt = Number(exp);
    if (!Number.isFinite(expInt) || expInt < now) throw new UnauthorizedException('Signed media url expired');
    const expected = this.sign(path, exp);
    if (expected !== sig) throw new UnauthorizedException('Invalid signed media url');
  }
}
