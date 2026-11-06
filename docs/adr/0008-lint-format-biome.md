# 0008 — Linting and formatting: Biome

- **Status:** accepted
- **Date:** 2026-09-13

## Context

Several team members edit the same files within a four-hour session and merge through pull requests. Formatting noise in diffs slows review; tool configuration differences between machines cause needless failures.

## Options

1. **Biome** (formatter and linter in one tool)
2. ESLint with typescript-eslint, plus Prettier
3. Formatter only

## Decision

Use **Biome** for formatting and linting, with one `biome.json` at the workspace root.

- `bun run lint` runs `biome check`; `bun run format` runs `biome check --write`.
- Recommended rule set, including React hooks rules; project-specific exceptions are documented in `biome.json`.
- Type correctness is checked by `tsc --noEmit` (`bun run typecheck`), not by the linter.

## Consequences

- One fast tool, one configuration file, no plugin version conflicts.
- No type-aware lint rules (for example floating promises). Accepted: strict TypeScript and tests cover the important cases; revisit if review finds recurring problems.
- Participants used to ESLint and Prettier may need editor configuration; the Biome editor extension is listed in the session prerequisites.
