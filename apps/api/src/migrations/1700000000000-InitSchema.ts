import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial schema migration.
 * Creates: admins, categories, materials tables.
 * Enables pgvector extension.
 * Adds GIN index for full-text search and tsvector generated column.
 * Adds nullable embedding column (pgvector).
 */
export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable pgvector extension (safe if already exists)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    // -------------------------------------------------------------------------
    // Admins table
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admins" (
        "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
        "pin_hash"   VARCHAR      NOT NULL,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_admins" PRIMARY KEY ("id")
      )
    `);

    // -------------------------------------------------------------------------
    // Categories table
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "categories" (
        "id"         UUID         NOT NULL DEFAULT gen_random_uuid(),
        "name"       VARCHAR(256) NOT NULL,
        "parent_id"  UUID,
        "created_at" TIMESTAMPTZ  NOT NULL DEFAULT now(),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id"),
        CONSTRAINT "FK_categories_parent" FOREIGN KEY ("parent_id")
          REFERENCES "categories"("id") ON DELETE CASCADE
      )
    `);

    // -------------------------------------------------------------------------
    // Materials table
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE TYPE IF NOT EXISTS "material_status_enum" AS ENUM (
        'draft', 'active', 'pending', 'needs_review'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "materials" (
        "id"             UUID                    NOT NULL DEFAULT gen_random_uuid(),
        "title"          TEXT,
        "description"    TEXT,
        "category_id"    UUID,
        "media_url"      TEXT,
        "tags"           TEXT[]                  NOT NULL DEFAULT '{}',
        "status"         "material_status_enum"  NOT NULL DEFAULT 'pending',
        "is_ready"       BOOLEAN                 NOT NULL DEFAULT false,
        "embedding"      TEXT,
        "created_at"     TIMESTAMPTZ             NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ             NOT NULL DEFAULT now(),
        "deleted_at"     TIMESTAMPTZ,
        CONSTRAINT "PK_materials" PRIMARY KEY ("id"),
        CONSTRAINT "FK_materials_category" FOREIGN KEY ("category_id")
          REFERENCES "categories"("id") ON DELETE SET NULL
      )
    `);

    // -------------------------------------------------------------------------
    // tsvector search_vector column + GIN index
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      ALTER TABLE "materials"
      ADD COLUMN IF NOT EXISTS "search_vector" TSVECTOR
        GENERATED ALWAYS AS (
          to_tsvector(
            'simple',
            coalesce(title, '') || ' ' ||
            coalesce(description, '') || ' ' ||
            coalesce(array_to_string(tags, ' '), '')
          )
        ) STORED
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_search_vector"
      ON "materials" USING GIN ("search_vector")
    `);

    // -------------------------------------------------------------------------
    // pgvector embedding column (nullable, future use)
    // Note: The embedding TEXT column above is for compatibility.
    // A proper vector column can be added later when dimensions are decided.
    // -------------------------------------------------------------------------
    // NOTE TO FUTURE: Once embedding dimensions are decided, run:
    //   ALTER TABLE materials ADD COLUMN embedding_vector vector(<dim>);
    // and create: CREATE INDEX ON materials USING ivfflat (embedding_vector vector_cosine_ops);

    // -------------------------------------------------------------------------
    // Indexes for common filters
    // -------------------------------------------------------------------------
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_status"       ON "materials" ("status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_category_id"  ON "materials" ("category_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_deleted_at"   ON "materials" ("deleted_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_materials_is_ready"     ON "materials" ("is_ready")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "materials" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admins" CASCADE`);
    await queryRunner.query(`DROP TYPE IF EXISTS "material_status_enum"`);
  }
}
