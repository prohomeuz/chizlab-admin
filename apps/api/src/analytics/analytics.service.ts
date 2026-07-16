import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEvent, AnalyticsEventType } from './analytics-event.entity';
import { TrackEventItemDto } from './dto/track-events.dto';

export interface AnalyticsSummary {
  rangeDays: number;
  totals: {
    pageviews: number;
    clicks: number;
    uniqueSessions: number;
  };
  topPages: { path: string; count: number }[];
  topClicks: { label: string; path: string; count: number }[];
}

const TOP_LIMIT = 10;

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsEvent)
    private readonly repo: Repository<AnalyticsEvent>,
  ) {}

  async track(events: TrackEventItemDto[]): Promise<void> {
    if (!events.length) return;
    await this.repo.insert(
      events.map((e) => ({
        type: e.type,
        path: e.path,
        label: e.label ?? null,
        sessionId: e.sessionId,
      })),
    );
  }

  async summary(days: number): Promise<AnalyticsSummary> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [pageviews, clicks, uniqueSessionsRow, topPages, topClicks] = await Promise.all([
      this.repo
        .createQueryBuilder('e')
        .where('e.type = :type', { type: AnalyticsEventType.PAGEVIEW })
        .andWhere('e.created_at >= :since', { since })
        .getCount(),
      this.repo
        .createQueryBuilder('e')
        .where('e.type = :type', { type: AnalyticsEventType.CLICK })
        .andWhere('e.created_at >= :since', { since })
        .getCount(),
      this.repo
        .createQueryBuilder('e')
        .select('COUNT(DISTINCT e.session_id)', 'count')
        .where('e.created_at >= :since', { since })
        .getRawOne<{ count: string }>(),
      this.repo
        .createQueryBuilder('e')
        .select('e.path', 'path')
        .addSelect('COUNT(*)', 'count')
        .where('e.type = :type', { type: AnalyticsEventType.PAGEVIEW })
        .andWhere('e.created_at >= :since', { since })
        .groupBy('e.path')
        .orderBy('count', 'DESC')
        .limit(TOP_LIMIT)
        .getRawMany<{ path: string; count: string }>(),
      this.repo
        .createQueryBuilder('e')
        .select('e.label', 'label')
        .addSelect('e.path', 'path')
        .addSelect('COUNT(*)', 'count')
        .where('e.type = :type', { type: AnalyticsEventType.CLICK })
        .andWhere('e.created_at >= :since', { since })
        .andWhere('e.label IS NOT NULL')
        .groupBy('e.label')
        .addGroupBy('e.path')
        .orderBy('count', 'DESC')
        .limit(TOP_LIMIT)
        .getRawMany<{ label: string; path: string; count: string }>(),
    ]);

    return {
      rangeDays: days,
      totals: {
        pageviews,
        clicks,
        uniqueSessions: parseInt(uniqueSessionsRow?.count ?? '0', 10),
      },
      topPages: topPages.map((r) => ({ path: r.path, count: parseInt(r.count, 10) })),
      topClicks: topClicks.map((r) => ({
        label: r.label,
        path: r.path,
        count: parseInt(r.count, 10),
      })),
    };
  }
}
