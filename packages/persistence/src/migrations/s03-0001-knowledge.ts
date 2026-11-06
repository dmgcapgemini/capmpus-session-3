import { type Kysely, sql } from "kysely";
// biome-ignore lint/suspicious/noExplicitAny: migrations are independent of current schema
export async function up(db: Kysely<any>) {
  await sql`create table knowledge_documents (
    id text primary key, content text not null, authority text not null,
    observed_at timestamptz not null, facts jsonb not null,
    search tsvector generated always as (to_tsvector('english', content)) stored
  )`.execute(db);
  await sql`create index knowledge_documents_search_idx on knowledge_documents using gin(search)`.execute(db);
  await sql`create table knowledge_drivers (id text primary key, name text not null)`.execute(db);
  await sql`create table knowledge_licences (driver_id text primary key references knowledge_drivers(id), category text not null, observed_at timestamptz not null)`.execute(
    db,
  );
  await sql`create table knowledge_customers (id text primary key, name text not null)`.execute(db);
  await sql`create table knowledge_locations (id text primary key, customer_id text not null references knowledge_customers(id), window_minutes integer not null, observed_at timestamptz not null)`.execute(
    db,
  );
  await sql`create table knowledge_vehicles (id text primary key, required_licence text not null, payload_kg integer not null, observed_at timestamptz not null)`.execute(
    db,
  );
  await sql`create table knowledge_queries (run_id uuid primary key references agent_runs(id), reports jsonb not null default '[]', answer jsonb)`.execute(
    db,
  );
}
