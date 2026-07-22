import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelegramFields1700000000011 implements MigrationInterface {
  name = 'AddTelegramFields1700000000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Telegram channel message bookkeeping so the published channel post can be
    // kept in sync (edited / deleted) with the material.
    await queryRunner.query(`
      ALTER TABLE materials
        ADD COLUMN IF NOT EXISTS telegram_message_id BIGINT NULL,
        ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE materials
        DROP COLUMN IF EXISTS telegram_message_id,
        DROP COLUMN IF EXISTS telegram_chat_id
    `);
  }
}
