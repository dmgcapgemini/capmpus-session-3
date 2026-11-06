import { sql } from "kysely";
import type { LoomDatabase } from "./database.ts";
import { MIGRATION_TABLE } from "./migrate.ts";
import { isSQLite } from "./sqlite.ts";

export type DatabaseHealth =
  | { reachable: true; serverVersion: string; schemaVersion: string | null }
  | { reachable: false; error: string; code?: string };

/** Connects, reads the server version and the latest executed migration. */
export async function checkDatabase(db: LoomDatabase): Promise<DatabaseHealth> {
  try {
    if (isSQLite(db)) {
      const version = await sql<{ version: string }>`select sqlite_version() as version`.execute(db);
      const tables = await db.introspection.getTables();
      const exists = tables.some((table) => table.name === MIGRATION_TABLE);
      const latest = exists
        ? await sql<{
            name: string;
          }>`select name from ${sql.table(MIGRATION_TABLE)} order by name desc limit 1`.execute(db)
        : undefined;
      return {
        reachable: true,
        serverVersion: `SQLite ${version.rows[0]?.version}`,
        schemaVersion: latest?.rows[0]?.name ?? null,
      };
    }
    const version = await sql<{ server_version: string }>`show server_version`.execute(db);
    const migrationTable = await sql<{ exists: boolean }>`
      select to_regclass(${MIGRATION_TABLE}) is not null as exists
    `.execute(db);
    let schemaVersion: string | null = null;
    if (migrationTable.rows[0]?.exists) {
      const latest = await sql<{ name: string }>`
        select name from ${sql.table(MIGRATION_TABLE)} order by name desc limit 1
      `.execute(db);
      schemaVersion = latest.rows[0]?.name ?? null;
    }
    return { reachable: true, serverVersion: version.rows[0]?.server_version ?? "unknown", schemaVersion };
  } catch (error) {
    const err = error as { message?: string; code?: string };
    return { reachable: false, error: err.message ?? String(error), code: err.code };
  }
}
