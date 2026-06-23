import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import type { AppConfig } from '../config/config';
import { InjectRedis } from '../common/redis.provider';
import { Admin } from './admin.entity';
import type { JwtPayload } from './jwt.strategy';

const FAILED_ATTEMPTS_KEY = 'auth:pin_attempts';
const LOCKOUT_KEY = 'auth:lockout';
const BLOCKLIST_PREFIX = 'auth:blocklist:';
const MAX_ATTEMPTS = 5;
const LOCKOUT_TTL_SECONDS = 15 * 60; // 15 minutes

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdminIfNeeded();
  }

  private get cfg(): AppConfig {
    const c = this.configService.get<AppConfig>('app');
    if (!c) throw new Error('App config missing');
    return c;
  }

  /** Seed the admin record from env ADMIN_PIN on first startup. */
  private async seedAdminIfNeeded(): Promise<void> {
    const count = await this.adminRepo.count();
    if (count > 0) return;

    const pin = this.cfg.adminPin;
    if (!pin || !/^\d{8}$/.test(pin)) {
      this.logger.warn('ADMIN_PIN is not set or invalid — skipping admin seed');
      return;
    }
    const pinHash = await bcrypt.hash(pin, 12);
    const admin = this.adminRepo.create({ pinHash });
    await this.adminRepo.save(admin);
    this.logger.log('Default admin seeded from ADMIN_PIN env var');
  }

  async login(pin: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    // Check lockout
    const locked = await this.redis.get(LOCKOUT_KEY);
    if (locked) {
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: 'Account locked. Try again after 15 minutes.', error: 'Too Many Requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const admin = await this.adminRepo.findOne({ where: {} });
    if (!admin) {
      throw new UnauthorizedException('Invalid PIN');
    }

    const valid = await bcrypt.compare(pin, admin.pinHash);
    if (!valid) {
      await this.incrementFailedAttempts();
      throw new UnauthorizedException('Invalid PIN');
    }

    // Reset failed attempts on success
    await this.redis.del(FAILED_ATTEMPTS_KEY);

    return this.issueTokens(admin.id);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    // Check blocklist
    const blocked = await this.redis.get(`${BLOCKLIST_PREFIX}${refreshToken}`);
    if (blocked) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify<{ sub: string; type: string }>(refreshToken, {
        secret: this.cfg.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }

    const accessPayload: JwtPayload = { sub: payload.sub, type: 'access' };
    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.cfg.jwtAccessSecret,
      expiresIn: this.cfg.jwtAccessExpiresIn,
    });

    return { accessToken, expiresIn: this.cfg.jwtAccessExpiresIn };
  }

  async logout(refreshToken: string): Promise<void> {
    // Add to blocklist with TTL equal to refresh token lifetime
    await this.redis.set(
      `${BLOCKLIST_PREFIX}${refreshToken}`,
      '1',
      'EX',
      this.cfg.jwtRefreshExpiresIn,
    );
  }

  private async issueTokens(adminId: string): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const accessPayload: JwtPayload = { sub: adminId, type: 'access' };
    const refreshPayload = { sub: adminId, type: 'refresh' };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.cfg.jwtAccessSecret,
      expiresIn: this.cfg.jwtAccessExpiresIn,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.cfg.jwtRefreshSecret,
      expiresIn: this.cfg.jwtRefreshExpiresIn,
    });

    return { accessToken, refreshToken, expiresIn: this.cfg.jwtAccessExpiresIn };
  }

  private async incrementFailedAttempts(): Promise<void> {
    const attempts = await this.redis.incr(FAILED_ATTEMPTS_KEY);
    // Set TTL on first increment
    if (attempts === 1) {
      await this.redis.expire(FAILED_ATTEMPTS_KEY, LOCKOUT_TTL_SECONDS);
    }
    if (attempts >= MAX_ATTEMPTS) {
      await this.redis.set(LOCKOUT_KEY, '1', 'EX', LOCKOUT_TTL_SECONDS);
      await this.redis.del(FAILED_ATTEMPTS_KEY);
    }
  }
}
