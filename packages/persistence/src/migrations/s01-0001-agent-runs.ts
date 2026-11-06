import { type Kysely, sql } from "kysely";

// Session 1: agent runs and the analysis result each run may store.
// biome-ignore lint/suspicious/noExplicitAny: a migration must not depend on the current schema types
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    create table agent_runs (
      id                uuid primary key,
      task              text not null,
      status            text not null
                        check (status in ('running', 'completed', 'incomplete', 'failed', 'stopped')),
      client_profile    text not null check (client_profile in ('workshop', 'production')),
      model             text,
      session_id        text,
      started_at        timestamptz not null default now(),
      finished_at       timestamptz,
      error             text,
      model_calls       integer not null default 0,
      input_tokens      integer not null default 0,
      output_tokens     integer not null default 0,
      tool_calls        integer not null default 0,
      denied_tool_calls integer not null default 0
    )
  `.execute(db);
  await sql`create index agent_runs_started_at_idx on agent_runs (started_at desc)`.execute(db);

  await sql`
    create table analysis_results (
      id           bigint generated always as identity primary key,
      agent_run_id uuid not null unique references agent_runs (id),
      result       jsonb not null,
      created_at   timestamptz not null default now()
    )
  `.execute(db);
}
