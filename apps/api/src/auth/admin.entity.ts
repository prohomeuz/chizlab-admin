import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Single admin account.
 * Seeded on app startup from ADMIN_PIN env var if no admin exists yet.
 */
@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** bcrypt hash of the 8-digit PIN */
  @Column({ name: 'pin_hash' })
  pinHash!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
