/**
 * Bulk cover regeneration.
 *
 * Pushes a cover job for every material onto the same Redis queue the admin
 * panel uses, so the ai-worker regenerates each cover from the material's
 * current fields, uploads it to MinIO and calls back into the API to update
 * cover_url. Nothing here draws or uploads anything itself — it only enqueues,
 * which keeps the result identical to editing each material by hand.
 *
 * Run it after changing anything in cover_generator.py (fonts, spacing,
 * layout); existing covers are already-rendered JPEGs and do not change on
 * their own.
 *
 * Requires: Postgres, Redis and the ai-worker running (the API itself must be
 * up too — the worker calls it back with each new cover URL).
 *
 * Usage (from apps/api):
 *   npx ts-node -r tsconfig-paths/register src/scripts/regenerate-covers.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/scripts/regenerate-covers.ts
 *   npx ts-node -r tsconfig-paths/register src/scripts/regenerate-covers.ts --limit 10
 *   npx ts-node -r tsconfig-paths/register src/scripts/regenerate-covers.ts --id <uuid>
 *
 * Flags:
 *   --dry-run       list what would be enqueued, push nothing
 *   --limit <n>     only the first n materials
 *   --id <uuid>     a single material (repeatable)
 *   --delay <ms>    pause between jobs (default 150) so the worker is not flooded
 */
import Redis from 'ioredis';
import dataSource from '../database/typeorm.config';
import { Material } from '../materials/material.entity';
import { COVER_JOBS_KEY } from '../materials/ai-job.service';

interface Options {
  dryRun: boolean;
  limit: number | null;
  ids: string[];
  delayMs: number;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { dryRun: false, limit: null, ids: [], delayMs: 150 };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      opts.dryRun = true;
    } else if (arg === '--limit') {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error('--limit must be a positive integer');
      }
      opts.limit = value;
    } else if (arg === '--id') {
      const value = argv[++i];
      if (!value) throw new Error('--id needs a material uuid');
      opts.ids.push(value);
    } else if (arg === '--delay') {
      const value = Number(argv[++i]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error('--delay must be a non-negative number of ms');
      }
      opts.delayMs = value;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return opts;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const dbHost = process.env['DATABASE_HOST'] ?? 'localhost';
  const dbPort = process.env['DATABASE_PORT'] ?? '5432';
  try {
    await dataSource.initialize();
  } catch {
    throw new Error(
      `Cannot reach Postgres at ${dbHost}:${dbPort}. Start the database ` +
        '(docker compose -f infra/docker-compose.yml up -d postgres) or point ' +
        'DATABASE_HOST/PORT at it.',
    );
  }

  const repo = dataSource.getRepository(Material);
  const query = repo
    .createQueryBuilder('m')
    .select([
      'm.id',
      'm.title',
      'm.authors',
      'm.publishYear',
      'm.publishPlace',
      'm.country',
    ])
    // Soft-deleted rows are excluded by TypeORM; a material with no title
    // would render a blank cover, so skip those too.
    .where("m.title IS NOT NULL AND m.title <> ''")
    .orderBy('m.createdAt', 'ASC');

  if (opts.ids.length > 0) {
    query.andWhere('m.id IN (:...ids)', { ids: opts.ids });
  }
  if (opts.limit !== null) {
    query.take(opts.limit);
  }

  const materials = await query.getMany();

  if (materials.length === 0) {
    console.log('No materials matched — nothing to do.');
    await dataSource.destroy();
    return;
  }

  console.log(
    `${materials.length} material(s) to regenerate` +
      (opts.dryRun ? ' (dry run — nothing will be enqueued)' : ''),
  );

  if (opts.dryRun) {
    for (const m of materials) {
      console.log(`  ${m.id}  ${m.title}`);
    }
    await dataSource.destroy();
    return;
  }

  const redisHost = process.env['REDIS_HOST'] ?? 'localhost';
  const redisPort = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
  const redis = new Redis({
    host: redisHost,
    port: redisPort,
    lazyConnect: true,
    // Fail fast instead of retrying forever when Redis simply isn't running.
    maxRetriesPerRequest: 1,
  });
  try {
    await redis.connect();
  } catch {
    redis.disconnect();
    await dataSource.destroy();
    throw new Error(
      `Cannot reach Redis at ${redisHost}:${redisPort}. Start it ` +
        '(docker compose -f infra/docker-compose.yml up -d redis) — the cover ' +
        'queue lives there.',
    );
  }

  let enqueued = 0;
  try {
    for (const m of materials) {
      const job = JSON.stringify({
        materialId: m.id,
        title: m.title,
        authors: m.authors ?? [],
        publishYear: m.publishYear,
        publishPlace: m.publishPlace,
        country: m.country,
      });
      await redis.lpush(COVER_JOBS_KEY, job);
      enqueued++;
      console.log(`  [${enqueued}/${materials.length}] ${m.id}  ${m.title}`);
      if (opts.delayMs > 0) await sleep(opts.delayMs);
    }
  } finally {
    await redis.quit();
    await dataSource.destroy();
  }

  console.log(
    `\n${enqueued} job(s) enqueued on ${COVER_JOBS_KEY}. ` +
      'The ai-worker renders them one by one and the API updates each ' +
      'cover_url as the worker calls back — watch the worker log to follow ' +
      'progress. Covers get a fresh versioned URL, so no browser cache to clear.',
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  // Not process.exit() — that can cut off the message before it is flushed.
  process.exitCode = 1;
});
