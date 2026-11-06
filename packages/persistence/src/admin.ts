import { existsSync } from "node:fs";
import pg from "pg";
import { createDatabase } from "./database.ts";

/** Creates the database named in the URL when it does not exist yet. Returns true when created. */
export async function ensureDatabaseExists(databaseUrl: string): Promise<boolean> {
  if (databaseUrl.startsWith("sqlite:")) {
    const existed = existsSync(databaseUrl.slice(7));
    const db = createDatabase(databaseUrl);
    await db.destroy();
    return !existed;
  }
  const url = new URL(databaseUrl);
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Refusing to create database with unexpected name "${name}"`);
  }
  url.pathname = "/postgres";
  const client = new pg.Client({ connectionString: url.toString(), connectionTimeoutMillis: 5_000 });
  await client.connect();
  try {
    const existing = await client.query("select 1 from pg_database where datname = $1", [name]);
    if (existing.rowCount) return false;
    await client.query(`create database "${name}"`);
    return true;
  } finally {
    await client.end();
  }
}
