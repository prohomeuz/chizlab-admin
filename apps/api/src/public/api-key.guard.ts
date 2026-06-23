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
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cfg = this.configService.get<AppConfig>('app');
    const expectedKey = cfg?.publicApiKey;

    if (!expectedKey) {
      throw new UnauthorizedException('PUBLIC_API_KEY is not configured');
    }

    const apiKey = request.headers['x-api-key'];
    if (typeof apiKey !== 'string' || apiKey !== expectedKey) {
      throw new UnauthorizedException('Unauthorized');
    }

    return true;
  }
}
