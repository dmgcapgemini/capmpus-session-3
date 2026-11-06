# Session 1 — From model calls to an agentic harness

For an introduction to the purpose of Session 1 and its relationship to Loom, read [Understanding the foundations of Loom](INTRODUCTION.md).

## Learning objective

Build a controlled agent runtime that reads permitted sources, submits a structured analysis and exposes its execution. By the end, explain which decisions belong to Copilot and which belong to Loom.

## Model, assistant and agent

A model call maps supplied context to an output. An assistant adds a conversational interface. An agent runtime can repeatedly select tools, observe their results and continue a bounded task. Use a direct structured model call when no iterative tool use is needed; use deterministic code when the rules already determine the answer.

The harness is the surrounding application machinery: instructions, context, tools, permissions, session lifecycle, failure handling, validation, termination and observability. Better prompts cannot replace these controls.

## The two responsibilities

| Copilot runtime | Loom application |
|---|---|
| Interacts with the model and runs the inner tool-use loop | Supplies the task, instructions and available tools |
| Selects tools and observes their results | Validates arguments, checks evidence and controls side effects |
| Enforces configured hook and permission decisions | Defines the tool policy and records denials |
| Emits execution events | Stores run outcomes and streams the trace to the console |

Session 1 persists runs and analysis results in PostgreSQL, or in a local SQLite file when using the Session 1 fallback. Traces are process-local. Restart marks interrupted runs failed. Durable workflows, retries and human accept/reject transitions arrive in Session 2.

## Tools, skills and context

A tool is executable application capability with an input contract, result and explicit side effects. A skill is reusable guidance and supporting resources for a kind of task. Session 1 introduces the distinction but deliberately disables ambient skills and instruction discovery.

Context is what the model can see in its current interaction: runtime instructions, the task, tool definitions and returned source content. The source manifest identifies permitted files; the agent receives IDs, never permission to choose arbitrary paths. Source text is evidence to analyse, not instructions to obey.

## Validation and authority

Loom exposes three tools: `list_sources`, `read_source` and `submit_analysis_result`. Only the last stores an analysis. Its handler validates the schema and checks each quotation against a source read during that run.

The pre-tool policy rejects unregistered tools, submission before reading a source, and calls beyond the budget. The handler still validates its own inputs. A denial is a policy decision; a failed tool result is corrective feedback. Both must be visible.

A stored analysis is a run output. The tool's `accepted: true` confirms storage after validation, not human approval of a semantic model. Human-approved context belongs to later sessions.

## Observing the run

Use Agent activity for the sequence; Context for supplied instructions and tools; Tool calls for arguments and outcomes; Raw events for SDK diagnostics; Errors for denials and failures. The console shows model calls, tokens, tool calls and denials. Token counts are usage evidence, not a monetary cost estimate.

A final assistant message is not proof of completion. Completion requires a stored result and the application's final run status.

## References in your package

Read [the workshop](WORKSHOP.md), [tool contracts](TOOL-CONTRACTS.md) and [validation criteria](VALIDATION.md). The application architecture decisions are in `docs/adr/`, including ADR 0009 and ADR 0010.

## The runtime baseline

Loom runs on Bun 1.4.0. The API, TypeScript tools and Vitest suite use this pinned runtime; the Copilot runtime remains a separate process. Use `bun install --frozen-lockfile` and `bun run test`. The latter selects the workshop’s Vitest projects; `bun test` is a different runner. Read ADR 0013 in `docs/adr/`.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.
