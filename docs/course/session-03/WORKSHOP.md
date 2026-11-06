# Session 3 — Connect and qualify knowledge

Start with [the introductory reader](INTRODUCTION.md) for the purpose of this session and its relationship to Loom.

Goal: select the right source, preserve provenance, reject ineligible evidence and expose disagreement. Use [theory](THEORY.md) and finish with [validation](VALIDATION.md).

## Before the session

Before class, add the Session 3 full starter to a fresh `session-03/` folder following QUICKSTART.md and run all commands inside it. The supplied baseline includes the earlier reference implementations and workflow navigation. Keep your previous work and databases. Use Bun 1.4.0; create this folder's own `.env.local` from `.env.example`, keeping the default `DATABASE_URL=sqlite:./.loom/session-03.sqlite` (or explicitly selecting a separate PostgreSQL database `loom_session03`), `LOOM_SOURCES_DIR=examples/session-03` and the supplied FMS URL. Migrate and seed this new session database; earlier runtime history is not transferred. Installation, storage and mock setup finish before the four-hour class:

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
```

Type checking and linting must pass. Test failures must match [the workshop manifest](workshop-tests.json) exactly; every other test must pass. Do not change tests or remove guards to make them green.

## Four-hour schedule

| Segment | Minutes |
|---|---:|
| Opening source-selection demonstration | 20 |
| Provenance, registry and policy walkthrough | 30 |
| Block 1: relational lookup | 40 |
| Block 2: authority and freshness | 40 |
| Break | 10 |
| Block 3: conflicts | 35 |
| Block 4: external tool and evaluation | 40 |
| Validation and team explanation | 25 |
| Total | 240 |

## Block 1 — Join exact records

Open `packages/persistence/src/knowledge.ts` and implement `lookupKnowledgeRecords`. Support driver, location and vehicle IDs through parameterised queries. Join drivers to licences and locations to customers. Return an empty array for unknown IDs. Use the stored observation time, the supplied retrieval time, authoritative metadata and stable evidence references.

For drivers use source `hr`, reference `record:driver:<id>` and fact key `driver.<id>.licence`. For locations use `erp`, `record:location:<id>` and `location.<id>.window_minutes`. For vehicles use `fleet-register`, `record:vehicle:<id>`, `vehicle.<id>.licence`. Include the entity ID and the joined information in readable content. Use numeric values as strings in facts.

```bash
bun --bun run vitest run --project integration apps/api/src/knowledge/knowledge.int.test.ts
```

Compare D-101 with the spreadsheet and LOC-SM1 with the agreement. Do not rewrite the fixtures to reconcile their disagreement.

## Block 2 — Qualify evidence

Implement `rejectionReason` in `packages/agent-tools/src/knowledge/policy.ts`. Reject unverified authority first, then future observations beyond five seconds, then age beyond the method limit: documents 365 days, records 7 days and FMS 120 seconds. Return a useful reason for rejection and `null` for eligible evidence. Check exact boundaries against the supplied clock.

The retrieval wrapper and submission guard already call this function. Explain why both calls matter. Confirm that rejected content does not appear in the successful items returned to the agent, while the report retains its reference and reason.

The stale-export keyword cases also depend on this policy exercise. They are included in the workshop manifest; the document search implementation is already supplied.

```bash
bun --bun run vitest run --project unit packages/agent-tools/src/knowledge/knowledge.test.ts
```

## Block 3 — Preserve conflicts

Implement `detectKnowledgeConflicts` in the same policy file. Group facts by key, normalise values by trimming, collapsing whitespace and lowercasing, and preserve their evidence references. Emit only keys with different values supported by different sources. Sort output deterministically and deduplicate references. Repeated observations from one source alone do not establish a cross-source conflict.

Test the route acknowledgement, driver licence and delivery-window disagreements. Stale and unverified evidence must be filtered before conflict detection. Explain why a 2023 export is reported as rejected rather than used to reinforce a current ERP claim.

## Block 4 — Connect the external tool

In `packages/agent-tools/src/knowledge/tools.ts`, register `get_vehicle_status` beside the other retrieval tools. Use `VehicleLookup`, the FMS adapter and the common retrieval wrapper. Describe current operational vehicle status as its purpose. Do not expose an arbitrary URL tool or bypass policy. The mock and HTTP adapter are already supplied.

After all four blocks, run the deterministic evaluation:

```bash
bun run eval:knowledge scripted
```

Expect ten passing rows. The report is saved under `.loom/knowledge-evaluation-scripted.json`. It uses a separate `_eval.sqlite` file by default, reseeds it and switches the mock between normal, stale, failed and slow modes. With explicit PostgreSQL it creates a separate evaluation database; that account needs permission to create it. Scripted mode makes no model calls.

For a real source-selection check, run:

```bash
bun run eval:knowledge live
```

This sends the questions and retrieved fictional evidence to GitHub Copilot using your configured account. Inspect `.loom/knowledge-evaluation-live.json` and explain each failure before changing prompts or tools. The evaluator supplies expected labels and tool calls only to scripted mode; live mode receives only questions. Retain both reports and distinguish deterministic correctness from model performance.

## Inspect the browser

For ordinary live use, run the mock in one terminal and the application in another:

```bash
bun run mock:fms normal
```

```bash
bun run dev
```

Ask a route-change question. Inspect quotations, observation and retrieval times, authority, conflicts and source-access reports. Select an earlier query after restarting the API: its answer and retrieval reports must remain. The earlier workflow screen remains accessible through the navigation button.

For a repeatable browser demonstration without a model, stop the normal API. Set `DATABASE_URL=sqlite:./.loom/session-03_demo.sqlite` (or a separate PostgreSQL connection ending in `loom_session03_demo`), retaining the web proxy's API port, then run:

```bash
bun run demo:knowledge
```

```bash
bun run --filter @loom/web dev
```

Paste an exact question from `examples/session-03/questions.json`. This fixture chooses the listed tools; it is labelled scripted in the UI. Its FMS always runs in normal mode; use the evaluator for stale, failure and timeout scenarios. Restore your ordinary database setting after stopping the demo.

## Finish

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Submit your implementation and validation evidence through your team's normal review process. Explain one correct source choice, one rejected source, one visible conflict and one unresolved answer. Keep local environment files and raw runtime reports out of version control.
