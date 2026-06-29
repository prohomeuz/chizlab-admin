import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRejectedStatus1700000000004 implements MigrationInterface {
  name = 'AddRejectedStatus1700000000004';

  // PostgreSQL does not allow using a newly-added enum value in the same
  // transaction it was added. Use transaction=false and commit manually.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Commit 1: add 'rejected' to existing enum ──────────────────────────
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`
        ALTER TYPE "material_status_enum" ADD VALUE IF NOT EXISTS 'rejected'
      `);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }

    // ── Commit 2: add rejection_reason column ──────────────────────────────
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`
        ALTER TABLE "materials"
          ADD COLUMN IF NOT EXISTS "rejection_reason" text NULL
      `);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`
        ALTER TABLE "materials" DROP COLUMN IF EXISTS "rejection_reason"
      `);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }

    // Note: PostgreSQL does not support removing enum values directly.
    // Removing 'rejected' would require recreating the type — skip in down().
  }
}
