import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AppConfig } from '../config/config';

@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cfg = this.configService.get<AppConfig>('app');
    const secret = cfg?.internalCallbackSecret;

    if (!secret) {
      throw new UnauthorizedException('INTERNAL_CALLBACK_SECRET is not configured');
    }

    const header = request.headers['x-internal-secret'];
    if (typeof header !== 'string' || header !== secret) {
      throw new UnauthorizedException('Invalid internal secret');
    }

    return true;
  }
}
