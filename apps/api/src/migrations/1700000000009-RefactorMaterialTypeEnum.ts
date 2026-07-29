import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorMaterialTypeEnum1700000000009 implements MigrationInterface {
  name = 'RefactorMaterialTypeEnum1700000000009';

  // PostgreSQL does not allow using a newly-added enum value in the same
  // transaction. We use transaction=false and manage two commits manually.
  transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Commit 1: add the new values to the existing enum ──────────────────
    // 'study_guide' is needed in commit 2 to migrate the old
    // 'textbook_electronic' rows before the type is replaced.
    await queryRunner.startTransaction();
    try {
      await queryRunner.query(`
        ALTER TYPE "material_type_enum" ADD VALUE IF NOT EXISTS 'study_guide'
      `);
      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }

    // ── Commit 2: migrate data + replace enum type ─────────────────────────
    await queryRunner.startTransaction();
    try {
      // "Elektron o'quv qo'llanma" becomes "O'quv qo'llanma"
      await queryRunner.query(`
        UPDATE "materials"
          SET "material_type" = 'study_guide'
          WHERE "material_type" = 'textbook_electronic'
      `);
      // "Taqdimot" has no counterpart in the new list — clear it so the admin
      // can pick a valid type manually.
      await queryRunner.query(`
        UPDATE "materials"
          SET "material_type" = NULL
          WHERE "material_type" = 'presentation'
      `);

      await queryRunner.query(`
        CREATE TYPE "material_type_enum_new" AS ENUM (
          'textbook',
          'study_guide',
          'monograph',
          'article',
          'thesis',
          'methodical_guide',
          'project_album',
          'patent',
          'state_standard',
          'abstract',
          'course'
        )
      `);

      await queryRunner.query(`
        ALTER TABLE "materials"
          ALTER COLUMN "material_type" TYPE "material_type_enum_new"
            USING "material_type"::text::"material_type_enum_new"
      `);

      await queryRunner.query(`DROP TYPE "material_type_enum"`);
      await queryRunner.query(`
        ALTER TYPE "material_type_enum_new" RENAME TO "material_type_enum"
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
        CREATE TYPE "material_type_enum_old" AS ENUM (
          'textbook_electronic',
          'thesis',
          'article',
          'textbook',
          'monograph',
          'presentation'
        )
      `);

      // Values introduced by this migration have no equivalent in the old
      // enum — clear them so the cast can succeed.
      await queryRunner.query(`
        UPDATE "materials"
          SET "material_type" = NULL
          WHERE "material_type" IN (
            'methodical_guide',
            'project_album',
            'patent',
            'state_standard',
            'abstract',
            'course'
          )
      `);
      await queryRunner.query(`
        UPDATE "materials"
          SET "material_type" = 'textbook_electronic'
          WHERE "material_type" = 'study_guide'
      `);

      await queryRunner.query(`
        ALTER TABLE "materials"
          ALTER COLUMN "material_type" TYPE "material_type_enum_old"
            USING "material_type"::text::"material_type_enum_old"
      `);

      await queryRunner.query(`DROP TYPE "material_type_enum"`);
      await queryRunner.query(`
        ALTER TYPE "material_type_enum_old" RENAME TO "material_type_enum"
      `);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    }
  }
}
