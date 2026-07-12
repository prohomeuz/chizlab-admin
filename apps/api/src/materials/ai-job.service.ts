import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/config';

export const AI_JOBS_KEY = 'chizlab:ai:pending';
export const COVER_JOBS_KEY = 'chizlab:cover:pending';

@Injectable()
export class AiJobService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiJobService.name);
  private redis!: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const cfg = this.configService.get<AppConfig>('app')!;
    this.redis = new Redis({
      host: cfg.redisHost,
      port: cfg.redisPort,
      lazyConnect: false,
    });
    this.redis.on('error', (err) =>
      this.logger.error('Redis connection error', err),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async enqueue(
    materialId: string,
    mediaUrl: string,
    selectedPages?: number[] | null,
  ): Promise<void> {
    const job = JSON.stringify({
      materialId,
      mediaUrl,
      selectedPages: selectedPages ?? null,
    });
    await this.redis.lpush(AI_JOBS_KEY, job);
    this.logger.log(`AI job enqueued for material=${materialId}`);
  }

  /** Ask the worker to regenerate a material's cover from its current fields. */
  async enqueueCover(
    materialId: string,
    fields: {
      title: string;
      authors: string[];
      publishYear: number | null;
      publishPlace: string | null;
      country: string | null;
    },
  ): Promise<void> {
    const job = JSON.stringify({ materialId, ...fields });
    await this.redis.lpush(COVER_JOBS_KEY, job);
    this.logger.log(`Cover job enqueued for material=${materialId}`);
  }

  async getProgress(materialId: string): Promise<number> {
    const val = await this.redis.get(`material:${materialId}:progress`);
    return val ? parseInt(val, 10) : 0;
  }
}
