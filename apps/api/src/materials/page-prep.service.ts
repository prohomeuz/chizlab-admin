import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/config';

export const PAGE_PREP_JOBS_KEY = 'chizlab:pages:pending';
const RESULT_TTL_SECONDS = 60 * 60; // 1 hour — enough for the admin to finish the form

export interface PagePrepResultPayload {
  success: boolean;
  pageCount?: number;
  thumbnailUrls?: string[];
  error?: string;
}

export interface PagePrepStatus {
  status: 'pending' | 'done' | 'error';
  progress: number;
  pageCount?: number;
  thumbnailUrls?: string[];
  error?: string;
}

@Injectable()
export class PagePrepService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PagePrepService.name);
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

  async enqueue(jobId: string, mediaUrl: string): Promise<void> {
    const job = JSON.stringify({ jobId, mediaUrl });
    await this.redis.lpush(PAGE_PREP_JOBS_KEY, job);
    this.logger.log(`Page-prep job enqueued jobId=${jobId}`);
  }

  async getStatus(jobId: string): Promise<PagePrepStatus> {
    const [progressRaw, resultRaw] = await Promise.all([
      this.redis.get(`page-prep:${jobId}:progress`),
      this.redis.get(`page-prep:${jobId}:result`),
    ]);
    const progress = progressRaw ? parseInt(progressRaw, 10) : 0;

    if (!resultRaw) {
      return { status: 'pending', progress };
    }

    const result = JSON.parse(resultRaw) as PagePrepResultPayload;
    if (result.success) {
      return {
        status: 'done',
        progress: 100,
        pageCount: result.pageCount,
        thumbnailUrls: result.thumbnailUrls,
      };
    }
    return {
      status: 'error',
      progress,
      error: result.error ?? 'Sahifalarni tayyorlashda xatolik yuz berdi',
    };
  }

  async saveResult(jobId: string, payload: PagePrepResultPayload): Promise<void> {
    await this.redis.set(
      `page-prep:${jobId}:result`,
      JSON.stringify(payload),
      'EX',
      RESULT_TTL_SECONDS,
    );
  }
}
