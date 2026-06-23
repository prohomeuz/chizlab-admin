import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { Admin } from './admin.entity';
import { REDIS_CLIENT } from '../common/redis.provider';

// ---------------------------------------------------------------------------
// Shared mock factories
// ---------------------------------------------------------------------------

function makeAdminRepo(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    count: jest.fn().mockResolvedValue(1),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    ...overrides,
  };
}

function makeRedis(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    incr: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function makeConfig() {
  return {
    get: jest.fn().mockReturnValue({
      adminPin: '12345678',
      jwtAccessSecret: 'access-secret',
      jwtRefreshSecret: 'refresh-secret',
      jwtAccessExpiresIn: 900,
      jwtRefreshExpiresIn: 604800,
      internalCallbackSecret: 'internal-secret',
    }),
  };
}

function makeJwt() {
  return {
    sign: jest.fn().mockReturnValue('mock-token'),
    verify: jest.fn(),
  };
}

// ---------------------------------------------------------------------------
// Helpers to build the module under test
// ---------------------------------------------------------------------------

async function buildModule(
  adminRepoOverrides: Partial<Record<string, jest.Mock>> = {},
  redisOverrides: Partial<Record<string, jest.Mock>> = {},
) {
  const adminRepo = makeAdminRepo(adminRepoOverrides);
  const redis = makeRedis(redisOverrides);
  const config = makeConfig();
  const jwt = makeJwt();

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      AuthService,
      { provide: getRepositoryToken(Admin), useValue: adminRepo },
      { provide: JwtService, useValue: jwt },
      { provide: ConfigService, useValue: config },
      { provide: REDIS_CLIENT, useValue: redis },
    ],
  }).compile();

  // Skip the bootstrap seeding — it tries to hit the real DB
  const service = module.get<AuthService>(AuthService);
  return { service, adminRepo, redis, jwt };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  // -------------------------------------------------------------------------
  // login()
  // -------------------------------------------------------------------------
  describe('login()', () => {
    it('returns tokens when PIN is correct', async () => {
      const pinHash = await bcrypt.hash('12345678', 1);
      const mockAdmin: Admin = { id: 'admin-uuid', pinHash, createdAt: new Date(), updatedAt: new Date() };

      const { service, redis } = await buildModule({ findOne: jest.fn().mockResolvedValue(mockAdmin) });
      redis.get.mockResolvedValue(null); // no lockout

      const result = await service.login('12345678');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 900);
    });

    it('throws UnauthorizedException on wrong PIN', async () => {
      const pinHash = await bcrypt.hash('12345678', 1);
      const mockAdmin: Admin = { id: 'admin-uuid', pinHash, createdAt: new Date(), updatedAt: new Date() };

      const { service, redis } = await buildModule({ findOne: jest.fn().mockResolvedValue(mockAdmin) });
      redis.get.mockResolvedValue(null);

      await expect(service.login('00000000')).rejects.toThrow(UnauthorizedException);
    });

    it('increments failure counter on wrong PIN', async () => {
      const pinHash = await bcrypt.hash('12345678', 1);
      const mockAdmin: Admin = { id: 'admin-uuid', pinHash, createdAt: new Date(), updatedAt: new Date() };

      const { service, redis } = await buildModule({ findOne: jest.fn().mockResolvedValue(mockAdmin) });
      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(1);

      await expect(service.login('00000000')).rejects.toThrow(UnauthorizedException);
      expect(redis.incr).toHaveBeenCalledWith('auth:pin_attempts');
    });

    it('throws 429 when account is locked', async () => {
      const { service, redis } = await buildModule();
      redis.get.mockResolvedValue('1'); // lockout active

      await expect(service.login('12345678')).rejects.toThrow(
        expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }),
      );
    });

    it('sets lockout after MAX_ATTEMPTS (5) failures', async () => {
      const pinHash = await bcrypt.hash('12345678', 1);
      const mockAdmin: Admin = { id: 'admin-uuid', pinHash, createdAt: new Date(), updatedAt: new Date() };

      const { service, redis } = await buildModule({ findOne: jest.fn().mockResolvedValue(mockAdmin) });
      redis.get.mockResolvedValue(null);
      redis.incr.mockResolvedValue(5); // 5th attempt — threshold hit

      await expect(service.login('00000000')).rejects.toThrow(UnauthorizedException);
      expect(redis.set).toHaveBeenCalledWith('auth:lockout', '1', 'EX', expect.any(Number));
    });

    it('throws UnauthorizedException when no admin exists', async () => {
      const { service, redis } = await buildModule({ findOne: jest.fn().mockResolvedValue(null) });
      redis.get.mockResolvedValue(null);

      await expect(service.login('12345678')).rejects.toThrow(UnauthorizedException);
    });

    it('resets failure counter on successful login', async () => {
      const pinHash = await bcrypt.hash('12345678', 1);
      const mockAdmin: Admin = { id: 'admin-uuid', pinHash, createdAt: new Date(), updatedAt: new Date() };

      const { service, redis } = await buildModule({ findOne: jest.fn().mockResolvedValue(mockAdmin) });
      redis.get.mockResolvedValue(null);

      await service.login('12345678');
      expect(redis.del).toHaveBeenCalledWith('auth:pin_attempts');
    });
  });

  // -------------------------------------------------------------------------
  // refresh()
  // -------------------------------------------------------------------------
  describe('refresh()', () => {
    it('returns a new access token for a valid refresh token', async () => {
      const { service, redis, jwt } = await buildModule();
      redis.get.mockResolvedValue(null); // not blocklisted
      jwt.verify.mockReturnValue({ sub: 'admin-uuid', type: 'refresh' });
      jwt.sign.mockReturnValue('new-access-token');

      const result = await service.refresh('valid-refresh-token');

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('expiresIn', 900);
    });

    it('throws UnauthorizedException when refresh token is blocklisted', async () => {
      const { service, redis } = await buildModule();
      redis.get.mockResolvedValue('1'); // token is blocklisted

      await expect(service.refresh('blocked-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token is expired/invalid', async () => {
      const { service, redis, jwt } = await buildModule();
      redis.get.mockResolvedValue(null);
      jwt.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token type is not "refresh"', async () => {
      const { service, redis, jwt } = await buildModule();
      redis.get.mockResolvedValue(null);
      jwt.verify.mockReturnValue({ sub: 'admin-uuid', type: 'access' }); // wrong type

      await expect(service.refresh('access-token-used-as-refresh')).rejects.toThrow(UnauthorizedException);
    });
  });
});
