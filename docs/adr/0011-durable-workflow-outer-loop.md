# ADR 0011 — Loom owns a durable workflow around transient agent runs

Status: accepted for Session 2 implementation.

## Context

Session 1 stores individual analysis runs. A conversation cannot provide crash recovery, duplicate protection or a human decision checkpoint. Session 2 needs an explicit outer process without another agent framework.

## Decision

Use PostgreSQL workflows and versioned workflow events. State changes and audit insertions share a transaction. Each bounded invocation gets a new run ID. A workflow submission key is bound by Loom's result-store adapter; identical replay returns the same result, changed replay or a stale attempt fails. Proposal persistence and its state transition are atomic.

A single local worker shares the run service's one active invocation slot. Failed/incomplete calls retry within a persisted budget, at one-second scheduling intervals. Startup marks interrupted runs and resumes pending workflows. Committed proposals advance directly to review. Human accept/reject HTTP actions require the expected version and a reason. These actions are never agent tools.

## Consequences

The process survives API restarts while raw SDK traces remain transient. This controls application of results, not the number of model invocations. A valid committed proposal remains reviewable if an invocation subsequently fails. The workshop assumes one local API per database and does not add authentication or distributed worker leases. Human acceptance records a decision about an analysis; the later semantic accepted-context model is still out of scope.

An explicit scripted fixture demonstrates failures and real process restart independently of provider behaviour. The normal application retains the Copilot runner.
