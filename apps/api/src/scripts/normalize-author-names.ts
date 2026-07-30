/**
 * One-off cleanup: put a space after every initial in stored author names.
 *
 * Author names reach the database in two shapes depending on how they were
 * entered or extracted by the AI: "M. K. Xalimov" (spaced) and "M.R.Radjabov"
 * (not spaced). Neither the admin form nor the cover generator used to fix the
 * second shape — both treat a name that already starts with an initial as
 * final — so covers showed the two styles side by side.
 *
 * The input side is fixed now (abbreviateAuthor in the admin form and
 * _abbreviate_author in cover_generator.py both space initials out), but rows
 * written before that keep their old spelling. This script rewrites them.
 *
 * It only inserts spaces after dots and collapses runs of whitespace; it never
 * reorders a name, changes letters, or touches anything but the authors array.
 *
 * Covers are already-rendered JPEGs and do not follow the database on their
 * own — run regenerate-covers.ts afterwards so the new spelling actually shows
 * up on the site.
 *
 * Usage (from apps/api):
 *   npx ts-node -r tsconfig-paths/register src/scripts/normalize-author-names.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register src/scripts/normalize-author-names.ts
 *
 * In the production container (no ts-node there — it is built with
 * `npm ci --omit=dev`):
 *   docker exec chizlab_api node dist/scripts/normalize-author-names.js --dry-run
 *
 * Flags:
 *   --dry-run   print the before/after list, write nothing
 */
import dataSource from '../database/typeorm.config';
import { Material } from '../materials/material.entity';

/**
 * "M.R.Radjabov" → "M. R. Radjabov". Keys off the dot rather than the letter
 * before it, so multi-letter initials ("Sh.", "Yu.") and Uzbek letters ("G'.")
 * are handled as well. A dot at the end of the string is left alone — there is
 * nothing to separate it from.
 */
export function spaceOutInitials(name: string): string {
  return name
    .replace(/\.(?=\S)/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const unknown = process.argv.slice(2).filter((a) => a !== '--dry-run');
  if (unknown.length > 0) {
    throw new Error(`Unknown argument(s): ${unknown.join(', ')}`);
  }

  const dbHost = process.env['DATABASE_HOST'] ?? 'localhost';
  const dbPort = process.env['DATABASE_PORT'] ?? '5432';
  try {
    await dataSource.initialize();
  } catch {
    throw new Error(
      `Cannot reach Postgres at ${dbHost}:${dbPort}. Start the database or ` +
        'point DATABASE_HOST/PORT at it.',
    );
  }

  const repo = dataSource.getRepository(Material);
  // Soft-deleted rows are excluded by TypeORM. Rows with no authors are
  // skipped by the comparison below anyway.
  const materials = await repo.find({
    select: ['id', 'title', 'authors'],
    order: { createdAt: 'ASC' },
  });

  let changedRows = 0;
  let changedNames = 0;

  for (const m of materials) {
    const before = m.authors ?? [];
    const after = before.map(spaceOutInitials);
    if (before.length === after.length && before.every((v, i) => v === after[i])) {
      continue;
    }

    changedRows++;
    console.log(`\n${m.id}  ${m.title}`);
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) {
        changedNames++;
        console.log(`   "${before[i]}"  →  "${after[i]}"`);
      }
    }

    if (!dryRun) {
      // update() rather than save() so nothing else on the row is rewritten.
      await repo.update({ id: m.id }, { authors: after });
    }
  }

  await dataSource.destroy();

  if (changedRows === 0) {
    console.log(`\n${materials.length} material(s) checked — every name is already spaced out.`);
    return;
  }

  console.log(
    `\n${changedNames} name(s) in ${changedRows} of ${materials.length} material(s) ` +
      (dryRun
        ? 'would be rewritten (dry run — nothing was written).'
        : 'rewritten. Covers still show the old spelling until they are ' +
          'regenerated — run regenerate-covers.ts next.'),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? (err.stack ?? err.message) : err);
  // Not process.exit() — that can cut off the message before it is flushed.
  process.exitCode = 1;
});
