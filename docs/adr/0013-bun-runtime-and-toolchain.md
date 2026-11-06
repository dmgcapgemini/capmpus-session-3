# ADR 0013 — Bun runtime and toolchain

- **Status:** accepted
- **Date:** 2026-09-18
- **Supersedes:** ADR 0001's Node.js/pnpm runtime and workspace decision

## Decision

Loom uses Bun 1.4.0 for application execution and dependency management. `.bun-version`, `packageManager: bun@1.4.0` and `engines.bun` pin the same exact version. Preflight checks the actual `process.versions.bun`, not Bun's Node compatibility version.

Use `package.json` workspaces and committed `bun.lock`. `bun install --frozen-lockfile` must succeed without dependency updates. The lockfile was migrated from the existing pnpm lock; application package versions remain pinned. `trustedDependencies: []` disables dependency lifecycle scripts, including the unused in-process Copilot transport's build hook.

The API and packages execute TypeScript source directly. Existing `node:` imports are compatibility APIs, not a requirement to run Node. Keep strict type checking with `tsc --noEmit`, Vite for the browser bundle, Biome, and Vitest. Tool scripts explicitly run under Bun and `bunfig.toml` prevents Node shebangs from selecting a different runtime. `bun run test` applies Vitest's unit/integration project selection; plain `bun test` is reserved for the standalone handover/hidden tests documented by the campus team.

Environment variables remain the configuration interface. Scripts load the reference `.env.local` using Bun's `--env-file` flag, and Zod validates the resulting configuration. Shell-provided values take precedence. Workspace packages export TypeScript source, with no backend build step.

Copilot's SDK/runtime versions and control policy remain separate from Bun. Workshop authentication, server-safe `empty` mode, allowed tools, disabled ambient context, cancellation and persisted results keep their existing contracts. Bun compatibility is verified with the reference tests; live provider checks are reported separately.

## Verification and delivery

Check frozen installation, type checking, lint, unit and real PostgreSQL integration suites, Vite build, hidden tests, scripted evaluation and participant basic derivation. A unit test asserts that the Vitest worker itself runs under the pinned Bun version.

Historical verification records and immutable session tags retain their original runtime. New Bun releases need new annotated session candidates/revisions and fresh complete/basic verification. The current handover builder rejects pre-Bun tags with directions to use the original tagged builder for historical reproduction. No automatic rewriting of old tags or dependency versions occurs.

## Consequences

One Bun runtime/package-manager baseline applies to local development, CI and deployment. Native dependencies and provider transports still need platform-specific validation; passing a Bun unit suite alone does not establish full production compatibility. PostgreSQL remains authoritative for workflow state; changing the JavaScript runtime does not change the application control model.
