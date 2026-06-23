import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds soft-delete support to categories.
 * CLAUDE.md rule: never hard-delete any record.
 */
export class AddCategoryDeletedAt1700000000001 implements MigrationInterface {
  name = 'AddCategoryDeletedAt1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_categories_deleted_at"
      ON "categories" ("deleted_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_categories_deleted_at"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "deleted_at"`);
  }
}
