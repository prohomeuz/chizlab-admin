import { ConfigService } from '@nestjs/config';
import { FactoryProvider, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import type { AppConfig } from '../config/config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

/** Injection decorator shorthand */
export const InjectRedis = (): ReturnType<typeof Inject> => Inject(REDIS_CLIENT);

export const RedisProvider: FactoryProvider<Redis> = {
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService): Redis => {
    const cfg = configService.get<AppConfig>('app');
    return new Redis({
      host: cfg?.redisHost ?? 'localhost',
      port: cfg?.redisPort ?? 6379,
      lazyConnect: true,
    });
  },
  inject: [ConfigService],
};
