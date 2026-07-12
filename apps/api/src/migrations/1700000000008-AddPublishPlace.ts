import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublishPlace1700000000008 implements MigrationInterface {
  name = 'AddPublishPlace1700000000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE materials
        ADD COLUMN IF NOT EXISTS publish_place TEXT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE materials
        DROP COLUMN IF EXISTS publish_place
    `);
  }
}
