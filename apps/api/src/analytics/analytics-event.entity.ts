import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum AnalyticsEventType {
  PAGEVIEW = 'pageview',
  CLICK = 'click',
}

@Entity('analytics_events')
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ type: 'enum', enum: AnalyticsEventType, enumName: 'analytics_event_type_enum' })
  type!: AnalyticsEventType;

  /** Page path the event happened on, e.g. "/materiallar/topografik-chizmachilik". */
  @Index()
  @Column({ type: 'text' })
  path!: string;

  /**
   * Clicked element's label — explicit data-analytics attribute, falling back to
   * aria-label / text content / href, computed client-side. Null for pageview events.
   */
  @Column({ type: 'text', nullable: true })
  label!: string | null;

  /** Anonymous per-browser id (localStorage) — lets us count roughly unique visitors. */
  @Column({ type: 'text', name: 'session_id' })
  sessionId!: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}
