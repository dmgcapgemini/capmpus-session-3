# 0005 — Database access and migrations: Kysely with forward-only SQL migrations

- **Status:** accepted
- **Date:** 2026-09-13

## Context

PostgreSQL holds Loom's durable state: agent runs, analysis results, workflows and audit events (Session 2), proposals and accepted context (Sessions 4–6), artifacts and drift reports later. Session 2 teaches transactions, optimistic locking and idempotency, so participants must be able to see and reason about the SQL.

The schema grows session by session. Each session's starting point is generated from the reference implementation, so migrations must stay stable once a session is published.

## Options

1. **Kysely** (typed query builder) with hand-written SQL migrations
2. Drizzle ORM with `drizzle-kit` generated migrations
3. `pg` only, with `node-pg-migrate`
4. Prisma

## Decision

- **`pg`** as the driver and **Kysely** as a typed query builder, in `packages/persistence`.
- **Database types are written by hand** in `packages/persistence/src/schema.ts`, next to the migrations that create them.
- **Migrations are TypeScript files containing raw SQL**, run with Kysely's migrator: `bun run db:migrate`.
- **Forward-only and additive.** No down migrations; a correction is a new migration.
- **Named by session:** `s01-0001-agent-runs.ts`, `s02-0001-workflows.ts`, so alphabetical order is session order and each session's schema changes are easy to find.
- Transactions and row locking use Kysely's transaction API; where SQL is the lesson, `sql` template literals are used directly.

## Consequences

- SQL stays visible, which is what Session 2 teaches.
- Drizzle's generated migrations are convenient but hide the SQL and produce diffs that are awkward to keep stable across published sessions.
- `node-pg-migrate` alone would give migrations without typed queries; Prisma adds a code generation step and a separate schema language.
- Hand-written types can drift from the database; an integration test in the persistence package compares them with `information_schema`.
