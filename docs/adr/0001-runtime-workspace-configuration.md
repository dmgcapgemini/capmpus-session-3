# 0001 — Runtime, workspace and configuration

- **Status:** superseded by [ADR 0013](0013-bun-runtime-and-toolchain.md) on 2026-09-18
- **Date:** 2026-09-13

## Context

Loom is a TypeScript monorepo with a web application, an API and several shared packages. Teams run it on their own machines, on macOS and Linux, during four-hour sessions. Every minute spent on build tooling is a minute not spent on agent engineering, and every build step is a place where versions drift between machines.

## Options

1. **Node.js 24 running TypeScript directly** (built-in type stripping), `tsc` only for type checking, Vite only for the browser bundle.
2. Compile packages with `tsc` or a bundler before running.
3. Run TypeScript through `tsx` or `ts-node`.

## Decision

- **Node.js 24 LTS**, pinned in `.nvmrc` and `engines`.
- **pnpm workspaces**, `pnpm` version pinned through `packageManager`.
- **Server and packages run TypeScript source directly** with Node's type stripping. Workspace packages export `./src/index.ts`; there is no build step for `apps/api` or `packages/*`. Verified: Node resolves pnpm's workspace symlinks to their real path, so type stripping applies.
- **TypeScript in strict mode** with `erasableSyntaxOnly` and `verbatimModuleSyntax`, so every file is valid input for type stripping (no `enum`, `namespace` or constructor parameter properties). `tsc --noEmit` is the type checker.
- **Configuration** comes from environment variables. `.env.local` (never committed) is loaded with `node --env-file-if-exists=.env.local`; `.env.example` documents every variable. A Zod schema in `packages/config` validates the environment at startup and in `pnpm preflight`.

Workspace layout:

```text
apps/api            Fastify API
apps/web            Vite + React application
packages/config     environment schema
packages/contracts  Zod contracts shared by API, tools and web
packages/persistence database access and migrations
packages/agent-runtime  Copilot SDK client, sessions, event mapping
packages/agent-tools    Loom tools exposed to the agent
```

## Consequences

- Fast start and restart (`node --watch`), no stale build output, identical code in development and tests.
- Stack traces point at the source files participants edit.
- TypeScript features that need code generation are unavailable; this is acceptable and keeps code straightforward.
- Node.js 24 is a hard requirement; `pnpm preflight` checks it.
- The environment check is named `preflight`, not `doctor`: pnpm has a built-in `pnpm doctor` command that takes precedence over a workspace script of the same name.
