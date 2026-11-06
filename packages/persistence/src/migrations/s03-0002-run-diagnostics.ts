import { type Kysely, sql } from "kysely";
// biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current schema
export async function up(db: Kysely<any>) {
  await sql`alter table agent_runs add column diagnostics jsonb`.execute(db);
}
