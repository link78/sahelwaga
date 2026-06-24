// Resilient wrapper around `prisma migrate deploy`.
//
// Why this exists:
// The API runs `prisma migrate deploy` on every boot. If a migration is
// interrupted (lost DB connection, statement timeout, container killed
// mid-deploy) Prisma records it as a *failed* migration in
// `_prisma_migrations`. Every subsequent boot then aborts with P3009
// ("migrate found failed migrations") and the service can never start again
// without manual intervention.
//
// Our migrations are pure DDL (CREATE TYPE / CREATE TABLE / ALTER TABLE), which
// Postgres runs inside a single transaction per migration. A failure therefore
// rolls the whole migration back, leaving `applied_steps_count = 0` and no
// schema changes behind. In that — and only that — case it is safe to mark the
// migration as rolled-back and let `migrate deploy` re-apply it cleanly.
//
// If a failed migration applied one or more steps (partial apply, e.g. a
// non-transactional statement), recovery is NOT safe to automate: we surface
// the original error so an operator can resolve it manually following
// https://pris.ly/d/migrate-resolve.

import { execFileSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

type FailedMigration = {
  migration_name: string;
  applied_steps_count: number;
};

function runPrisma(args: string[]): void {
  execFileSync('prisma', args, { stdio: 'inherit' });
}

async function findFailedMigrations(): Promise<FailedMigration[]> {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{ migration_name: string; applied_steps_count: number | bigint }>
    >(
      `SELECT migration_name, applied_steps_count
         FROM "_prisma_migrations"
        WHERE finished_at IS NULL
          AND rolled_back_at IS NULL`,
    );
    return rows.map((row) => ({
      migration_name: row.migration_name,
      applied_steps_count: Number(row.applied_steps_count),
    }));
  } finally {
    await prisma.$disconnect();
  }
}

async function main(): Promise<void> {
  try {
    runPrisma(['migrate', 'deploy']);
    return;
  } catch (deployError) {
    // Only attempt recovery for the specific "failed migration" (P3009) case.
    // For any other failure (e.g. the DB is unreachable), querying the
    // migrations table below will also fail and we rethrow the original error.
    let failed: FailedMigration[];
    try {
      failed = await findFailedMigrations();
    } catch {
      throw deployError;
    }

    if (failed.length === 0) {
      // Deploy failed for a reason unrelated to a recorded failed migration.
      throw deployError;
    }

    const partiallyApplied = failed.filter((m) => m.applied_steps_count > 0);
    if (partiallyApplied.length > 0) {
      const names = partiallyApplied.map((m) => m.migration_name).join(', ');
      console.error(
        `Cannot auto-recover: the following failed migration(s) applied one or ` +
          `more steps and need manual resolution (https://pris.ly/d/migrate-resolve): ${names}`,
      );
      throw deployError;
    }

    for (const migration of failed) {
      console.warn(
        `Recovering rolled-back migration "${migration.migration_name}" ` +
          `(no steps were applied); marking it rolled-back and retrying.`,
      );
      runPrisma(['migrate', 'resolve', '--rolled-back', migration.migration_name]);
    }

    runPrisma(['migrate', 'deploy']);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
