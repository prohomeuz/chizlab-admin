import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyticsEvents1700000000010 implements MigrationInterface {
  name = 'CreateAnalyticsEvents1700000000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE analytics_event_type_enum AS ENUM ('pageview', 'click');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type analytics_event_type_enum NOT NULL,
        path TEXT NOT NULL,
        label TEXT NULL,
        session_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events (type)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_path ON analytics_events (path)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS analytics_events`);
    await queryRunner.query(`DROP TYPE IF EXISTS analytics_event_type_enum`);
  }
}
