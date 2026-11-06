import { Database as BunDatabase } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  Kysely,
  type KyselyPlugin,
  type PluginTransformQueryArgs,
  type PluginTransformResultArgs,
  type QueryResult,
  type RootOperationNode,
  SqliteDialect,
  type UnknownRow,
} from "kysely";
import type { Database } from "./schema.ts";

const sqliteDatabases = new WeakSet<Kysely<Database>>();
export const isSQLite = (db: Kysely<Database>): boolean => sqliteDatabases.has(db);
const parameters = (values: ReadonlyArray<unknown>) =>
  values.map((value) => (value instanceof Date ? value.toISOString() : value));
const timestampColumns = new Set(["updated_at", "started_at", "finished_at", "created_at", "observed_at"]);

// Keep PostgreSQL's Date/object result contract at the persistence boundary.
class SQLiteValues implements KyselyPlugin {
  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return args.node;
  }
  async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return {
      ...args.result,
      rows: args.result.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => {
            if (timestampColumns.has(key) && typeof value === "string") return [key, new Date(value)];
            if (
              ["result", "facts", "reports", "answer", "diagnostics"].includes(key) &&
              typeof value === "string"
            )
              return [key, JSON.parse(value)];
            return [key, value];
          }),
        ),
      ),
    };
  }
}

/** File-backed storage for the Session 3 classroom; selecting PostgreSQL never reaches this adapter. */
export function createSQLiteDatabase(databaseUrl: string): Kysely<Database> {
  const file = databaseUrl.slice("sqlite:".length);
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const database = new BunDatabase(file, { create: true, strict: true });
  database.run("PRAGMA foreign_keys = ON");
  database.run("PRAGMA busy_timeout = 5000");
  if (file !== ":memory:") database.run("PRAGMA journal_mode = WAL");
  const db = new Kysely<Database>({
    dialect: new SqliteDialect({
      database: {
        close: () => database.close(true),
        prepare(sql) {
          const statement = database.prepare(sql);
          return {
            reader: statement.columnNames.length > 0,
            all(values) {
              try {
                return statement.all(...parameters(values));
              } finally {
                statement.finalize();
              }
            },
            run(values) {
              try {
                return statement.run(...parameters(values));
              } finally {
                statement.finalize();
              }
            },
            *iterate(values) {
              try {
                yield* statement.iterate(...parameters(values));
              } finally {
                statement.finalize();
              }
            },
          };
        },
      },
    }),
    plugins: [new SQLiteValues()],
  });
  sqliteDatabases.add(db);
  return db;
}
