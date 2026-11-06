# Architecture Decision Records — Loom

Decisions about the Loom reference implementation. These records are part of the application and are shipped with it. Course-level decisions live elsewhere and are not shipped.

Format: status, date, context, options, decision, consequences. Records are never rewritten after acceptance; a later record supersedes an earlier one.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-runtime-workspace-configuration.md) | Runtime, workspace and configuration | superseded by 0013 |
| [0002](0002-api-framework-fastify.md) | API framework: Fastify | accepted |
| [0003](0003-web-vite-react.md) | Web application: Vite and React | accepted |
| [0004](0004-contracts-zod.md) | Contracts and validation: Zod | accepted |
| [0005](0005-database-access-migrations.md) | Database access and migrations: Kysely with forward-only SQL migrations | storage extended by 0014 for Session 3 |
| [0006](0006-testing-vitest-postgresql.md) | Testing: Vitest against real PostgreSQL | storage extended by 0014 for Session 3 |
| [0007](0007-event-streaming-sse.md) | Streaming events to the browser: Server-Sent Events | accepted |
| [0008](0008-lint-format-biome.md) | Linting and formatting: Biome | accepted |
| [0009](0009-copilot-sdk-client-configuration.md) | Copilot SDK client configuration | accepted |
| [0010](0010-agent-loop-application-state.md) | Copilot owns the inner loop; Loom owns application state | accepted |
| [0011](0011-durable-workflow-outer-loop.md) | Durable workflow outer loop | accepted |
| [0012](0012-knowledge-access-and-evidence.md) | Heterogeneous knowledge and evidence policy | accepted |
| [0013](0013-bun-runtime-and-toolchain.md) | Bun runtime and toolchain | accepted |
| [0014](0014-session-03-sqlite.md) | Session 3 SQLite-default local delivery and optional PostgreSQL | accepted |
