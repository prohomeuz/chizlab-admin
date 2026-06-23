import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../categories/category.entity';

export enum MaterialStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PENDING = 'pending',
  NEEDS_REVIEW = 'needs_review',
}

@Entity('materials')
export class Material {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'category_id' })
  categoryId!: string | null;

  @Column({ type: 'text', nullable: true, name: 'media_url' })
  mediaUrl!: string | null;

  @Column({ type: 'text', array: true, default: [] })
  tags!: string[];

  @Column({
    type: 'enum',
    enum: MaterialStatus,
    default: MaterialStatus.PENDING,
  })
  status!: MaterialStatus;

  @Column({ default: false, name: 'is_ready' })
  isReady!: boolean;

  /**
   * pgvector embedding stored as text via cast.
   * NULL until an embedding is computed.
   * NOTE: OpenAPI contract defines this as number[] | null —
   * stored as text in PG, serialized as number[] on output.
   */
  @Column({ type: 'text', nullable: true })
  embedding!: string | null;

  /**
   * tsvector generated column for full-text search.
   * Populated by a DB trigger / generated column in the migration.
   * We select it but never set it from TypeORM directly.
   */
  @Column({ type: 'tsvector', nullable: true, select: false, name: 'search_vector' })
  searchVector!: unknown;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  @ManyToOne(() => Category, { nullable: true, eager: false })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;

  /** Serialise embedding to number[] for API responses. */
  getEmbeddingArray(): number[] | null {
    if (!this.embedding) return null;
    try {
      // pgvector stores as '[1,2,3]'
      return JSON.parse(this.embedding) as number[];
    } catch {
      return null;
    }
  }
}
