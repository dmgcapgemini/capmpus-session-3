# 0004 — Contracts and validation: Zod

- **Status:** accepted
- **Date:** 2026-09-13

## Context

Loom's central rule is that nothing crosses a boundary unvalidated: tool arguments from the agent, API requests from the browser, agent proposals before persistence, environment variables at startup. The same contract is often needed in several places, for example an analysis result is a tool input, an API response and a UI type.

The Copilot SDK defines tool parameters with Zod schemas (`defineTool`) and depends on Zod 4 itself.

## Options

1. **Zod 4**
2. Valibot
3. TypeBox or JSON Schema

## Decision

Use **Zod 4** for every contract, in `packages/contracts`.

- Tool parameters: passed to `defineTool` directly.
- Tool handlers re-validate their arguments with `safeParse` and return a failure result with the validation message, so the agent can correct itself.
- API: request and response schemas through `fastify-type-provider-zod`.
- Web: types inferred from the same schemas.
- Contracts are versioned by explicit names (`SemanticGraphProposalV0`) when later sessions change them.

## Consequences

- One schema language across agent tools, API, persistence boundaries and UI; types are inferred, never duplicated.
- Same major version as the Copilot SDK, so tool schemas need no conversion.
- Valibot is smaller, but bundle size is not a concern here and the SDK integration favours Zod.
