import { type Kysely, sql } from "kysely";

// Session 0: a key-value table for workspace metadata. Proves the migration pipeline.
// biome-ignore lint/suspicious/noExplicitAny: a migration must not depend on the current schema types
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    create table loom_meta (
      key        text primary key,
      value      text not null,
      updated_at timestamptz not null default now()
    )
  `.execute(db);
}
