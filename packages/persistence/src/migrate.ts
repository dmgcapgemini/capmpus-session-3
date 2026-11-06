import type { Kysely } from "kysely";
import { Migrator } from "kysely/migration";
import { migrations } from "./migrations/index.ts";
import { isSQLite } from "./sqlite.ts";
import { sqliteMigrations } from "./sqlite-migrations.ts";

export const MIGRATION_TABLE = "loom_migration";
export const MIGRATION_LOCK_TABLE = "loom_migration_lock";

// biome-ignore lint/suspicious/noExplicitAny: migrations run against any schema version
type AnyDatabase = Kysely<any>;

function createMigrator(db: AnyDatabase): Migrator {
  return new Migrator({
    db,
    provider: { getMigrations: async () => (isSQLite(db) ? sqliteMigrations : migrations) },
    migrationTableName: MIGRATION_TABLE,
    migrationLockTableName: MIGRATION_LOCK_TABLE,
  });
}

export type MigrationRun = { applied: string[]; error?: unknown };

/** Applies all pending migrations in name order. */
export async function migrateToLatest(db: AnyDatabase): Promise<MigrationRun> {
  const { error, results = [] } = await createMigrator(db).migrateToLatest();
  const applied = results.filter((r) => r.status === "Success").map((r) => r.migrationName);
  return error === undefined ? { applied } : { applied, error };
}

export type MigrationStatus = { name: string; executedAt?: Date };

/** All registered migrations with their execution time, if executed. */
export async function migrationStatus(db: AnyDatabase): Promise<MigrationStatus[]> {
  const infos = await createMigrator(db).getMigrations();
  return infos.map((info) => ({ name: info.name, executedAt: info.executedAt }));
}
