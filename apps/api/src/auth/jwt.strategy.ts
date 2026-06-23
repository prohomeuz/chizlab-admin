import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AppConfig } from '../config/config';

export interface JwtPayload {
  sub: string;
  type: 'access';
}

export interface AuthenticatedAdmin {
  adminId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly configService: ConfigService) {
    const cfg = configService.get<AppConfig>('app');
    if (!cfg?.jwtAccessSecret) {
      throw new Error('JWT_ACCESS_SECRET is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.jwtAccessSecret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedAdmin {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }
    return { adminId: payload.sub };
  }
}
