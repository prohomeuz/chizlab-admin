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

    // GIN trigram index on authors array (as concatenated string)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_authors_trgm"
      ON "materials" USING GIN ((array_to_string(authors, ' ')) gin_trgm_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_materials_authors_trgm"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_materials_title_trgm"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS pg_trgm`);
  }
}
