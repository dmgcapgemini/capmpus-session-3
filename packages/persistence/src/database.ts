import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./schema.ts";
import { createSQLiteDatabase } from "./sqlite.ts";

export type LoomDatabase = Kysely<Database>;

export function createDatabase(databaseUrl: string, options: { maxConnections?: number } = {}): LoomDatabase {
  if (databaseUrl.startsWith("sqlite:")) return createSQLiteDatabase(databaseUrl);
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: options.maxConnections ?? 10,
    connectionTimeoutMillis: 5_000,
  });
  return new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
}
