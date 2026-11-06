# ADR 0010 — Copilot owns the inner loop; Loom owns application state

- Status: accepted for Session 1
- Date: 2026-09-14

## Context

A model may choose and repeat tool calls. Its conversation cannot be the authority for stored application state. Session 1 needs one observable analysis run without introducing the durable review workflow of Session 2.

## Decision

Copilot owns model interaction, reasoning, tool selection and iteration. Loom supplies the task, instructions, three registered tools, permission handler and pre-tool policy. Ambient instructions, skills, memory, host operations and environment context are disabled as specified in ADR 0009.

Loom resolves source IDs, validates tool inputs and evidence, and persists an analysis only through `submit_analysis_result`. The tool result's `accepted` flag means a validated run output was stored. It does not mean the human has approved semantic context.

The API owns run creation, a single-active-run reservation, cancellation, timing, usage totals and final status. Idle without a stored result is `incomplete`. Timeout or execution error is `failed`. Startup marks interrupted runs failed rather than resuming them.

The browser displays persisted results and process-local traces. SSE reconnect replays retained events by sequence number. A missing trace returns 410; a truncated buffer signals a trace gap. PostgreSQL stores runs and results, while the trace is limited to 2,000 events per run and 20 retained runs.

## Consequences

We can test the application with a scripted runner using the same tools and policy, independently of model variability. A live test exercises the real runtime separately. Each tool retains deterministic validation even when the pre-tool policy permits the call.

One API process per local workshop database is supported. Multi-process coordination, durable event history, retries, recovery and human accept/reject workflows belong to Session 2. No agent tool can approve future accepted context.
