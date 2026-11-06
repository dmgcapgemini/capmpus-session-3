import { type Kysely, sql } from "kysely";

// biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current schema types
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    create table workflows (
      id uuid primary key,
      task text not null,
      state text not null check (state in ('CREATED','ANALYSING','PROPOSAL_READY','AWAITING_REVIEW','ACCEPTED','REJECTED','FAILED')),
      version integer not null default 0 check (version >= 0),
      attempt integer not null default 0 check (attempt >= 0),
      max_attempts integer not null check (max_attempts between 1 and 5),
      run_id uuid references agent_runs(id),
      result_id bigint unique references analysis_results(id),
      submission_key uuid not null unique,
      error text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (attempt <= max_attempts),
      check (state not in ('PROPOSAL_READY','AWAITING_REVIEW','ACCEPTED','REJECTED') or result_id is not null)
    )
  `.execute(db);
  await sql`
    create table workflow_events (
      workflow_id uuid not null references workflows(id),
      version integer not null,
      from_state text,
      to_state text not null,
      reason text not null,
      run_id uuid references agent_runs(id),
      created_at timestamptz not null default now(),
      primary key (workflow_id, version)
    )
  `.execute(db);
  await sql`create index workflows_pending_idx on workflows(state, created_at)`.execute(db);
}
