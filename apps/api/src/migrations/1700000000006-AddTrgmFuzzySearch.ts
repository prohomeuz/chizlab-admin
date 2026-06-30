import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrgmFuzzySearch1700000000006 implements MigrationInterface {
  name = 'AddTrgmFuzzySearch1700000000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Enable trigram extension (bundled with PostgreSQL, no extra install needed)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // GIN trigram index on title for fast ILIKE + word_similarity
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_title_trgm"
      ON "materials" USING GIN (title gin_trgm_ops)
    `);

    // IMMUTABLE wrapper required because array_to_string is STABLE in PostgreSQL,
    // and GIN index expressions must be IMMUTABLE.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION immutable_array_to_text(arr text[])
      RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS
      $$ SELECT array_to_string(arr, ' ') $$
    `);

    // GIN trigram index on authors array (as concatenated string)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_authors_trgm"
      ON "materials" USING GIN (immutable_array_to_text(authors) gin_trgm_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_materials_authors_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_materials_title_trgm"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
  }
}
