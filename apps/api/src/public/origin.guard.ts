import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { AppConfig } from '../config/config';

function hostnameOf(value: string): string | null {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cfg = this.configService.get<AppConfig>('app');
    const allowedHosts = cfg?.publicAllowedOrigins ?? [];

    const originHeader = request.headers.origin;
    const refererHeader = request.headers.referer;
    const source = typeof originHeader === 'string' ? originHeader : refererHeader;

    const hostname = typeof source === 'string' ? hostnameOf(source) : null;
    if (!hostname || !allowedHosts.includes(hostname)) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}
