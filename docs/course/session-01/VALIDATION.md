# Session 1 — Validation

## Starting-point checks

The delivered baseline must pass type checking and linting. The deterministic test suite must fail exactly the cases listed in `workshop-tests.json`. That list identifies exercises, not tests to delete. All other tests must pass.

## Completed implementation

Check `bun --version` reports `1.4.0`, then install with `bun install --frozen-lockfile`. Use `bun run test` so Vitest applies the supplied project selection. Record this runtime with your results.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

All four commands must pass after the exercises. The live suite is separate and uses your Copilot allowance:

```bash
bun run test:live
```

Run live tests only with the fictional workshop sources and working Copilot authentication. They also need the dedicated test database. Provider outages or model variation must be recorded separately from deterministic failures.

## Demonstration checklist

- [ ] Start the application and show the configured tools and source IDs.
- [ ] Complete one real analysis and show the stored result.
- [ ] Show a successful source read and a rejected unknown ID or path.
- [ ] Show a policy denial or a failed tool result with corrective feedback.
- [ ] Inspect supplied context, tool arguments, outcomes and usage.
- [ ] Show that invalid schema or evidence cannot be stored.
- [ ] Refresh and retrieve the stored run result.
- [ ] Stop a run and explain its final status.

## Explanation checklist

- [ ] Distinguish a model, an assistant and an agent runtime.
- [ ] Describe what the harness contributes.
- [ ] Identify Copilot's inner loop and Loom's application authority.
- [ ] Distinguish executable tools from reusable skills.
- [ ] Explain why a stored run output is not human-approved context.
- [ ] Give one case where a direct model call or deterministic code is sufficient.
- [ ] Explain that traces can expire or disappear on restart even though results persist.

## Evidence record

Record the run ID, time, source IDs, result status, test outcome, one failure and its handling, and your explanation of ownership. Do not submit credentials or local environment files. Use [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for environment failures.

## SQLite fallback

Run the same checks with `DATABASE_URL=sqlite:./.loom/session-01.sqlite`. The test database must be a different file. After completing the exercises, verify that the stored analysis and its evidence remain available after stopping and restarting the API. A PostgreSQL failure never switches automatically to SQLite.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.
