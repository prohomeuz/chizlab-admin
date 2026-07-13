import { randomUUID } from 'crypto';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import type { AppConfig } from '../config/config';

export const AI_JOBS_KEY = 'chizlab:ai:pending';
export const COVER_JOBS_KEY = 'chizlab:cover:pending';
export const COVER_PREVIEW_JOBS_KEY = 'chizlab:cover-preview:pending';

/** How long to wait for the worker to render a cover preview. */
const COVER_PREVIEW_TIMEOUT_SEC = 5;

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

  /**
   * Render a cover preview synchronously through the worker: push a job with
   * a unique reply key, then block until the worker pushes the JPEG back
   * (base64-encoded) on that key. Returns null when the worker fails to
   * render or doesn't answer within the timeout.
   *
   * The blocking BRPOP runs on a dedicated connection — on the shared one it
   * would stall every other Redis command (e.g. progress polling) until the
   * reply arrives.
   */
  async renderCoverPreview(fields: {
    title: string;
    authors: string[];
    publishYear: number | null;
    publishPlace: string | null;
    country: string | null;
  }): Promise<Buffer | null> {
    const replyKey = `chizlab:cover-preview:reply:${randomUUID()}`;
    const job = JSON.stringify({
      replyKey,
      // Lets the worker skip jobs that sat in the queue past this deadline
      // (e.g. while it was down) — nobody is waiting on their reply anymore.
      expiresAt: Date.now() + COVER_PREVIEW_TIMEOUT_SEC * 1000,
      ...fields,
    });
    await this.redis.lpush(COVER_PREVIEW_JOBS_KEY, job);

    const conn = this.redis.duplicate();
    try {
      const reply = await conn.brpop(replyKey, COVER_PREVIEW_TIMEOUT_SEC);
      const b64 = reply?.[1];
      return b64 ? Buffer.from(b64, 'base64') : null;
    } finally {
      conn.disconnect();
    }
  }
}
