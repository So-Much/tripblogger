import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { loadAccessPublicKey } from './jwt-keys';

export interface JwtPayload {
  sub: string;
  role: string;
  statuses?: string[];
  iss?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const pem = loadAccessPublicKey();
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: pem ?? configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: pem ? ['RS256'] : ['HS256'],
    });
  }

  async validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      role: payload.role,
      statuses: Array.isArray(payload.statuses) ? payload.statuses : [],
    };
  }
}
