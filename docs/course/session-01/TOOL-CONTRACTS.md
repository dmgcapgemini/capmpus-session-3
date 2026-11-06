# Session 1 — Tool-contract cheat sheet

## Tool boundaries

| Tool | Input | Result | Side effect |
|---|---|---|---|
| `list_sources` | Empty object | Declared source IDs, names, media types and sizes | None |
| `read_source` | `sourceId` string | Content and metadata of one declared source | Records the successful read in this run's memory |
| `submit_analysis_result` | Structured analysis with evidence | `accepted: true` and `analysisResultId` after validation | Stores one analysis for the run |

## Analysis contract

The fields are `actors`, `capabilities`, `externalSystems`, `constraints`, `openQuestions` and `evidence`. The first five are arrays of up to 30 non-empty strings, each at most 300 characters. Evidence contains 1–20 entries with `sourceId` and a quotation of 10–500 characters.

Every quotation must occur in a source read during this run. Whitespace is normalised before comparison. Missing information belongs in open questions. Do not invent requirements to fill an array.

## Failure contracts

| Situation | Expected behaviour |
|---|---|
| Unknown ID or path-like value | Corrective failure; no arbitrary file access |
| Invalid schema or unsupported quotation | Corrective failure; no storage |
| Second accepted submission | Failure; original result remains |
| Unexpected storage error | Generic failure to the agent; details in the application log |
| Submission before any source read | Policy denial recorded in the trace |
| Unregistered tool or exhausted call budget | Policy denial |
| Non-Loom permission request | Permission rejection |

## Where to look

Contracts are in `packages/contracts/src/`. Tool handlers are in `packages/agent-tools/src/tools/`. Session configuration, instructions and policy are in `packages/agent-runtime/src/`. The API composes them in `apps/api/src/runs/`.
