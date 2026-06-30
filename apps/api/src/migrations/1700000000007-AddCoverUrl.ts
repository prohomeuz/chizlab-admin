import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoverUrl1700000000007 implements MigrationInterface {
  name = 'AddCoverUrl1700000000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE materials
        ADD COLUMN IF NOT EXISTS cover_url TEXT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE materials
        DROP COLUMN IF EXISTS cover_url
    `);
  }
}
