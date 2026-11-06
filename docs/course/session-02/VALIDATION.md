# Session 2 — Validation

Use this checklist after [the workshop](WORKSHOP.md). A passing test suite does not replace the team's explanation of the observed process.

## Automated checks

Check `bun --version` reports `1.4.0`, then install with `bun install --frozen-lockfile`. Use `bun run test` so Vitest applies the supplied project selection. Record this runtime with your results.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

All tests must pass in the completed implementation. In the initial starting point, only the names in [the workshop manifest](workshop-tests.json) fail.

## Demonstrate the process

| Criterion | Evidence to capture |
|---|---|
| Restart without losing workflow state | Same workflow ID and earlier audit events after killing and restarting the fixture API |
| Resume a pending process | New attempt and run ID under the existing workflow, within the original budget |
| Apply a result once | Repeated submission returns one result ID and creates one proposal event |
| Handle a failed invocation | Failed run, recorded retry and eventual review or bounded failure |
| Acceptance belongs to Loom | Agent acceptance tool denied; human HTTP decision changes review state once |
| Reject stale or illegal decisions | Conflict response, unchanged workflow and no extra audit event |

## Team review

Explain which data survives restart, who owns each loop, what the version protects, where the idempotency key comes from and what happens if the process dies after result storage. Show why a stored proposal is not human acceptance. Keep evidence free of local credentials.

## Completion levels

- Minimum: legal transitions, one failed invocation handled, one accepted or rejected human decision.
- Expected: all checks pass; restart recovery, identical replay and stale decisions demonstrated with durable history.
- Extended: a persisted retry delay or escalation rule from self-study, with an invalid-transition test.

## Troubleshooting

For SQLite, check the file path and folder permissions. For PostgreSQL, check its container, local port and database name. If a workflow remains queued, check that the API is running and another attempt is not occupying the single run slot. In the starting point, recovery and review are intentionally incomplete. If an attempt budget is exhausted, create a new workflow; terminal state is not reset. If the trace expired after restart, use workflow history and the stored result. If review conflicts, refresh and inspect the existing decision before trying again.

The fixture server requires a separate `_demo.sqlite` / `_demo.db` file or PostgreSQL database ending in `_demo` and never calls Copilot. The ordinary server needs the usual Copilot sign-in and network access. Run one API process per database. The independent facilitator dry run and release decision are recorded separately by the campus team.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.
