# Session 3 — Validation

Use this checklist after [the workshop](WORKSHOP.md). Separate local deterministic checks from live model evidence.

## Starting point

Type checking and linting pass before implementation. The failing test names exactly match [the workshop manifest](workshop-tests.json). The document adapter and mock service work; record lookup, policy, conflict detection and FMS tool registration are exercises.

## Complete implementation

Check `bun --version` reports `1.4.0`, then install with `bun install --frozen-lockfile`. Use `bun run test` so Vitest applies the supplied project selection. Record this runtime with your results.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run eval:knowledge scripted
```

All tests must pass; the scripted report must contain ten passing rows for the unchanged question set. Existing workflow and human-review tests must remain green. This verifies application behaviour, not model source selection.

## Evidence to retain

| Check | Required evidence |
|---|---|
| Document retrieval | Route question with exact quotation and document provenance |
| Joined records | D-101 licence and LOC-SM1 customer/window lookup |
| External source | FT-V-001 status from the FMS mock with both timestamps |
| Eligibility | Unverified chat, stale HR, stale export and stale FMS rejected |
| Failures | Failed and timed-out FMS recorded without invented evidence |
| Conflict | Route, licence and window disagreements with both references |
| Submission | Unknown reference, false quotation, expired evidence and duplicate submission rejected |
| Persistence | Same query ID, reports and answer after API restart |
| User interface | Citation, authority, age, uncertainty and conflict visible beside answer |

## Live source selection

```bash
bun run eval:knowledge live
```

Live evaluation sends questions and retrieved fictional source content to GitHub Copilot and consumes account allowance. Save the report path, run IDs, model, actual adapters and failures. The scorer checks exact adapter selection, eligible citations, expected conflicts and rejected sources, source failure and completed execution. It does not grade every natural-language claim. Review the answer's meaning separately.

If live evaluation cannot run, record the reason and leave that criterion pending. Do not rename a scripted report or describe it as model accuracy. A model choosing an extra source fails exact selection even if other checks pass.

## Review conversation

Explain why retrieval time cannot repair stale observation time; why a secondary source can be eligible yet disagree with an authoritative source; why conflicts are attached by the application; and why a citation alone does not prove an answer correct. Show that asking a knowledge question does not accept a Session 2 workflow.

## Delivery gates

Submit code and evidence through the team's usual review flow. An independent facilitator must still run the four-hour workshop on a non-GitHub host before the official course release. A locally verified candidate ZIP is not evidence that this dry run happened.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.

## Session 3 local storage

Use this folder’s own `.env.local` and SQLite application file by default; PostgreSQL remains explicit. Follow [SQLite setup](../../../QUICKSTART-SQLITE.md). Earlier tools and workflows are supplied complete. Keep application, test, evaluation and demonstration storage separate, and preserve the same application file when checking restart persistence. Storage selection does not change the four exercises or evidence policy.
