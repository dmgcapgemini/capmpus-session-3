import { type Kysely, sql } from "kysely";

// Same logical Session 3 schema and migration names; PostgreSQL migrations remain untouched.
export const sqliteMigrations = {
  "s00-0001-loom-meta": {
    // biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current table types
    async up(db: Kysely<any>) {
      await sql`create table loom_meta (
        key text primary key, value text not null,
        updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`.execute(db);
    },
  },
  "s01-0001-agent-runs": {
    // biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current table types
    async up(db: Kysely<any>) {
      await sql`create table agent_runs (
        id text primary key,
        task text not null,
        status text not null check (status in ('running', 'completed', 'incomplete', 'failed', 'stopped')),
        client_profile text not null check (client_profile in ('workshop', 'production')),
        model text, session_id text,
        started_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        finished_at text, error text,
        model_calls integer not null default 0, input_tokens integer not null default 0,
        output_tokens integer not null default 0, tool_calls integer not null default 0,
        denied_tool_calls integer not null default 0
      )`.execute(db);
      await sql`create index agent_runs_started_at_idx on agent_runs (started_at desc)`.execute(db);
      await sql`create table analysis_results (
        id integer primary key autoincrement,
        agent_run_id text not null unique references agent_runs (id),
        result text not null check (json_valid(result)),
        created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )`.execute(db);
    },
  },
  "s02-0001-workflows": {
    // biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current table types
    async up(db: Kysely<any>) {
      await sql`create table workflows (
        id text primary key,
        task text not null,
        state text not null check (state in ('CREATED','ANALYSING','PROPOSAL_READY','AWAITING_REVIEW','ACCEPTED','REJECTED','FAILED')),
        version integer not null default 0 check (version >= 0),
        attempt integer not null default 0 check (attempt >= 0),
        max_attempts integer not null check (max_attempts between 1 and 5),
        run_id text references agent_runs(id),
        result_id integer unique references analysis_results(id),
        submission_key text not null unique,
        error text,
        created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        check (attempt <= max_attempts),
        check (state not in ('PROPOSAL_READY','AWAITING_REVIEW','ACCEPTED','REJECTED') or result_id is not null)
      )`.execute(db);
      await sql`create table workflow_events (
        workflow_id text not null references workflows(id),
        version integer not null,
        from_state text,
        to_state text not null,
        reason text not null,
        run_id text references agent_runs(id),
        created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        primary key (workflow_id, version)
      )`.execute(db);
      await sql`create index workflows_pending_idx on workflows(state, created_at)`.execute(db);
    },
  },
  "s03-0001-knowledge": {
    // biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current table types
    async up(db: Kysely<any>) {
      await sql`create table knowledge_documents (
        id text primary key, content text not null, authority text not null,
        observed_at text not null, facts text not null check (json_valid(facts)),
        search text not null default ''
      )`.execute(db);
      // The shared 'search' column is PostgreSQL's vector. SQLite uses this external-content index.
      await sql`create virtual table knowledge_documents_fts using fts5(
        content, content='knowledge_documents', content_rowid='rowid', tokenize='porter unicode61'
      )`.execute(db);
      await sql`create trigger knowledge_documents_insert after insert on knowledge_documents begin
        insert into knowledge_documents_fts(rowid, content) values (new.rowid, new.content);
      end`.execute(db);
      await sql`create trigger knowledge_documents_delete after delete on knowledge_documents begin
        insert into knowledge_documents_fts(knowledge_documents_fts, rowid, content) values ('delete', old.rowid, old.content);
      end`.execute(db);
      await sql`create trigger knowledge_documents_update after update on knowledge_documents begin
        insert into knowledge_documents_fts(knowledge_documents_fts, rowid, content) values ('delete', old.rowid, old.content);
        insert into knowledge_documents_fts(rowid, content) values (new.rowid, new.content);
      end`.execute(db);
      await sql`create table knowledge_drivers (id text primary key, name text not null)`.execute(db);
      await sql`create table knowledge_licences (driver_id text primary key references knowledge_drivers(id), category text not null, observed_at text not null)`.execute(
        db,
      );
      await sql`create table knowledge_customers (id text primary key, name text not null)`.execute(db);
      await sql`create table knowledge_locations (id text primary key, customer_id text not null references knowledge_customers(id), window_minutes integer not null, observed_at text not null)`.execute(
        db,
      );
      await sql`create table knowledge_vehicles (id text primary key, required_licence text not null, payload_kg integer not null, observed_at text not null)`.execute(
        db,
      );
      await sql`create table knowledge_queries (
        run_id text primary key references agent_runs(id),
        reports text not null default '[]' check (json_valid(reports)),
        answer text check (answer is null or json_valid(answer))
      )`.execute(db);
    },
  },
  "s03-0002-run-diagnostics": {
    // biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current table types
    async up(db: Kysely<any>) {
      await sql`alter table agent_runs add column diagnostics text check (diagnostics is null or json_valid(diagnostics))`.execute(
        db,
      );
    },
  },
};
