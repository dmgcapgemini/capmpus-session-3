# 0006 — Testing: Vitest against real PostgreSQL

- **Status:** accepted
- **Date:** 2026-09-13

## Context

Loom's tests prove the course's claims: a tool rejects an unknown source, a duplicate tool result is applied once, a workflow survives a restart. Several of these depend on PostgreSQL behaviour (transactions, locks, constraints). SQLite is not supported.

Tests are also part of each session's starting point: selected tests fail in the starting point and pass once participants complete the workshop.

Agent behaviour itself is not deterministic: a model may refuse an unsafe request before calling any tool.

## Options

1. **Vitest**
2. Node's built-in test runner
3. Jest

## Decision

Use **Vitest**, organised in three kinds of test:

| Kind | File pattern | Needs | Runs in `bun run test` |
|---|---|---|---|
| Unit | `*.test.ts` | nothing | yes |
| Integration | `*.int.test.ts` | PostgreSQL in Podman; test database `<session database>_test`, created automatically | yes |
| Live agent | `*.live.test.ts` | a signed-in Copilot account | no, only `bun run test:live` |

- **Integration tests use real PostgreSQL.** Migrations run once in global setup; tables are truncated before each test; integration files run serially.
- **Tool handlers are tested directly**, not through a model, so rejections are deterministic.
- **The Copilot session is replaced by a scripted fake** at the `agent-runtime` boundary in unit and integration tests.
- **Live tests** exercise a real Copilot session and are used in dry runs and demonstrations, never as a gate.
- **Workshop tests** (expected to fail in a session's starting point) are listed per session in the session material, so the handover pipeline can verify that exactly those fail.

## Consequences

- Vitest shares Vite's TypeScript handling and gives watch mode and clear output with little configuration.
- `bun run test` needs PostgreSQL running; `bun run preflight` checks it and explains how to start it.
- Model behaviour is demonstrated, not asserted; correctness claims rest on deterministic tests.
