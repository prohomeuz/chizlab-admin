import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaterialTypeAndAiFields1700000000003 implements MigrationInterface {
  name = 'AddMaterialTypeAndAiFields1700000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum type (safe if already exists)
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE material_type_enum AS ENUM (
          'textbook_electronic',
          'thesis',
          'article',
          'textbook',
          'monograph',
          'presentation'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE materials
        ADD COLUMN IF NOT EXISTS material_type  material_type_enum NULL,
        ADD COLUMN IF NOT EXISTS language       TEXT NULL,
        ADD COLUMN IF NOT EXISTS publish_year   INTEGER NULL,
        ADD COLUMN IF NOT EXISTS country        TEXT NULL,
        ADD COLUMN IF NOT EXISTS page_count     INTEGER NULL,
        ADD COLUMN IF NOT EXISTS authors        TEXT[] NOT NULL DEFAULT '{}',
        ADD COLUMN IF NOT EXISTS blurb          TEXT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_materials_material_type
        ON materials (material_type)
        WHERE material_type IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_materials_material_type`);

    await queryRunner.query(`
      ALTER TABLE materials
        DROP COLUMN IF EXISTS material_type,
        DROP COLUMN IF EXISTS language,
        DROP COLUMN IF EXISTS publish_year,
        DROP COLUMN IF EXISTS country,
        DROP COLUMN IF EXISTS page_count,
        DROP COLUMN IF EXISTS authors,
        DROP COLUMN IF EXISTS blurb
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS material_type_enum`);
  }
}
