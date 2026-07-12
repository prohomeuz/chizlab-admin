import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Move existing media links from the old admin-prefixed path to the dedicated
 * media subdomain. The stored MinIO objects are untouched — only the URL prefix
 * is rewritten, and both hosts serve the same bucket, so links keep resolving.
 *
 *   https://admin.chizlab.uz/media/chizlab-media/<key>  ->  https://media.chizlab.uz/<key>
 *
 * IMPORTANT: run this only AFTER media.chizlab.uz is live (see infra/DEPLOY.md §4a).
 * Idempotent — the WHERE clause skips rows that were already migrated.
 */
export class MigrateMediaUrlDomain1700000000008 implements MigrationInterface {
  name = 'MigrateMediaUrlDomain1700000000008';

  private readonly OLD = 'https://admin.chizlab.uz/media/chizlab-media/';
  private readonly NEW = 'https://media.chizlab.uz/';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE materials SET media_url = REPLACE(media_url, $1, $2) WHERE media_url LIKE $3`,
      [this.OLD, this.NEW, `${this.OLD}%`],
    );
    await queryRunner.query(
      `UPDATE materials SET cover_url = REPLACE(cover_url, $1, $2) WHERE cover_url LIKE $3`,
      [this.OLD, this.NEW, `${this.OLD}%`],
    );
  }

  // No-op rollback: the new URLs remain valid (media.chizlab.uz serves the same
  // bucket), and reverting would also wrongly rewrite genuinely-new uploads.
  async down(): Promise<void> {
    // intentionally left blank — see note above
  }
}
