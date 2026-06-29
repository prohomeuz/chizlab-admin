import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixSearchVector1700000000005 implements MigrationInterface {
  name = 'FixSearchVector1700000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Update trigger to include authors field in search_vector
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION materials_search_vector_update()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          to_tsvector('simple'::regconfig,
            coalesce(NEW.title, '') || ' ' ||
            coalesce(NEW.description, '') || ' ' ||
            coalesce(array_to_string(NEW.tags, ' '), '') || ' ' ||
            coalesce(array_to_string(NEW.authors, ' '), '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Backfill all existing records (including soft-deleted)
    await queryRunner.query(`
      UPDATE materials
      SET search_vector = to_tsvector('simple'::regconfig,
        coalesce(title, '') || ' ' ||
        coalesce(description, '') || ' ' ||
        coalesce(array_to_string(tags, ' '), '') || ' ' ||
        coalesce(array_to_string(authors, ' '), '')
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore original trigger without authors
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION materials_search_vector_update()
      RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          to_tsvector('simple'::regconfig,
            coalesce(NEW.title, '') || ' ' ||
            coalesce(NEW.description, '') || ' ' ||
            coalesce(array_to_string(NEW.tags, ' '), '')
          );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
  }
}
