import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorStatusEnum1700000000002 implements MigrationInterface {
  name = 'RefactorStatusEnum1700000000002';

  // PostgreSQL does not allow using a newly-added enum value in the same
  // transaction. We use transaction=false and manage two commits manually.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Commit 1: add the new values to the existing enum ─────────────────
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`
        ALTER TYPE "material_status_enum" ADD VALUE IF NOT EXISTS 'ready'
      `);
      await queryRunner.query(`
        ALTER TYPE "material_status_enum" ADD VALUE IF NOT EXISTS 'pending'
      `);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }

    // ── Commit 2: migrate data + replace enum type ─────────────────────────
    await queryRunner.startTransaction();
    try {
      // Migrate existing rows
      await queryRunner.query(`
        UPDATE "materials" SET "status" = 'ready'   WHERE "status" = 'active'
      `);
      await queryRunner.query(`
        UPDATE "materials" SET "status" = 'pending' WHERE "status" = 'needs_review'
      `);

      // Create the 3-value replacement type
      await queryRunner.query(`
        CREATE TYPE "material_status_enum_new" AS ENUM ('pending', 'draft', 'ready')
      `);

      // Drop the DEFAULT so PostgreSQL can cast the column type freely
      await queryRunner.query(`
        ALTER TABLE "materials" ALTER COLUMN "status" DROP DEFAULT
      `);

      // Swap column type (cast via text intermediary)
      await queryRunner.query(`
        ALTER TABLE "materials"
          ALTER COLUMN "status" TYPE "material_status_enum_new"
            USING "status"::text::"material_status_enum_new"
      `);

      // Drop old type and rename new type to take its place
      await queryRunner.query(`DROP TYPE "material_status_enum"`);
      await queryRunner.query(`
        ALTER TYPE "material_status_enum_new" RENAME TO "material_status_enum"
      `);

      // Restore the DEFAULT using the renamed type
      await queryRunner.query(`
        ALTER TABLE "materials"
          ALTER COLUMN "status" SET DEFAULT 'pending'::"material_status_enum"
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
        CREATE TYPE "material_status_enum_old"
          AS ENUM ('draft', 'active', 'pending', 'needs_review')
      `);
      await queryRunner.query(`
        UPDATE "materials" SET "status" = 'active' WHERE "status" = 'ready'
      `);
      await queryRunner.query(`
        ALTER TABLE "materials" ALTER COLUMN "status" DROP DEFAULT
      `);
      await queryRunner.query(`
        ALTER TABLE "materials"
          ALTER COLUMN "status" TYPE "material_status_enum_old"
            USING "status"::text::"material_status_enum_old"
      `);
      await queryRunner.query(`DROP TYPE "material_status_enum"`);
      await queryRunner.query(`
        ALTER TYPE "material_status_enum_old" RENAME TO "material_status_enum"
      `);
      await queryRunner.query(`
        ALTER TABLE "materials"
          ALTER COLUMN "status" SET DEFAULT 'active'::"material_status_enum"
      `);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
