import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { InternalSecretGuard } from './internal-secret.guard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContext(headers: Record<string, string | undefined>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

async function buildGuard(secret: string | undefined) {
  const configService = {
    get: jest.fn().mockReturnValue(
      secret !== undefined
        ? { internalCallbackSecret: secret }
        : undefined,
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      InternalSecretGuard,
      { provide: ConfigService, useValue: configService },
    ],
  }).compile();

  return module.get<InternalSecretGuard>(InternalSecretGuard);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InternalSecretGuard', () => {
  it('returns true when the correct X-Internal-Secret header is provided', async () => {
    const guard = await buildGuard('super-secret-key');
    const ctx = makeContext({ 'x-internal-secret': 'super-secret-key' });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws UnauthorizedException when the header is missing', async () => {
    const guard = await buildGuard('super-secret-key');
    const ctx = makeContext({}); // no header

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when the header value is wrong', async () => {
    const guard = await buildGuard('super-secret-key');
    const ctx = makeContext({ 'x-internal-secret': 'wrong-value' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when INTERNAL_CALLBACK_SECRET env var is not configured', async () => {
    // configService.get returns object with no internalCallbackSecret (undefined)
    const guard = await buildGuard(undefined);
    const ctx = makeContext({ 'x-internal-secret': 'anything' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header is an empty string', async () => {
    const guard = await buildGuard('super-secret-key');
    const ctx = makeContext({ 'x-internal-secret': '' });

    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
