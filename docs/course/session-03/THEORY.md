# Session 3 — Knowledge access

Start with [the introductory reader](INTRODUCTION.md) for the purpose of this session and its relationship to Loom.

Loom now answers questions using documents, relational records and a simulated external fleet service. A source tool returns evidence with provenance; the application decides whether that evidence is eligible. Read [the workshop](WORKSHOP.md) and [validation](VALIDATION.md).

## Choose a retrieval method

| Question | Source | Retrieval |
|---|---|---|
| What does the route-change policy require? | Documents | Indexed Markdown search: SQLite FTS5 by default, PostgreSQL full-text search when selected |
| Which licence does D-101 hold? | Records | Exact ID lookup with relational joins |
| Is FT-V-001 available now? | FMS mock | Bounded HTTP request |

Document search uses an English text index and ranked lexical matches. It is not semantic similarity or an embedding service. Records preserve entity identity and relationships: a driver joins licence records; a location joins its customer. The external adapter validates its response before converting it into the common contract.

## Provenance is part of the result

Every item contains `sourceId`, `evidenceRef`, `method`, `observedAt`, `retrievedAt`, `authority`, `content` and curated `facts`. Observation time means when the source information was current; retrieval time means when Loom fetched it. Fetching an old export today does not make its facts fresh. Authority belongs to the configured adapter and dataset, not to a model assertion.

The source registry owns the three adapters. The agent sees `search_documents`, `lookup_records`, `get_vehicle_status` and `submit_knowledge_answer`. Tool descriptions guide source selection; the evaluation checks which adapters were actually called. Retrieval reports and the final answer survive an API restart. Raw invocation traces remain transient.

## Eligibility before reasoning

Reject unverified sources, observations more than five seconds in the future, and observations older than the method's limit. Exact age limits are inclusive: documents 365 days, records 7 days, FMS 120 seconds. Both authoritative and secondary sources can pass. Rejected reports expose identity and reason, without the rejected content. Recheck freshness at answer submission because evidence may expire during a run.

The fixture seed computes some observation times relative to seeding, so exercises remain repeatable. The 2023 export stays old. These are simulated snapshot ages, not dates of real business events. Reseeding refreshes simulated snapshots; it is not a production freshness mechanism.

## Disagreement must remain visible

The operations manual requires driver acknowledgement after a route change; the dispatcher interview describes a practice without it. The fleet spreadsheet says D-101 has C, while HR says C1. The customer agreement says a 30-minute window at LOC-SM1, while ERP holds 60 minutes. The driver-chat access restriction is unverified; the old export is stale.

Conflict detection groups curated fact keys and compares normalised values across different sources. It attaches conflicts to the stored answer even when the model omits them. This detects the declared fixture contradictions; it does not discover arbitrary contradictions in prose or establish which source is true. Report the conflict and uncertainty rather than silently resolving it.

## Evidence and answers

Submission accepts only references retrieved in the current query, still eligible under policy, and quotations that occur in their source after whitespace normalisation. Nonempty answers require citations. With no usable evidence, the answer must be empty and uncertainty explicit. Fabricated references, altered quotations and a second submission are rejected.

A valid quotation proves that text exists in a source. It does not prove that every claim in a generated answer follows from that text. Human review of meaning is still required. Knowledge answers do not approve a Session 2 workflow or create accepted semantic context.

## Evaluate two different things

Expected evidence references must also match the question; an empty answer cannot pass a case that requires evidence. FMS expectations use a reference prefix because observation time changes. The ten shared questions cover source choice, conflicts, unavailable sources, stale snapshots and low authority. Scripted mode uses predeclared tool calls to test the application plumbing. Live mode gives only the question to Copilot and measures actual tool selection, eligible citations, conflicts, rejected sources and failures. A passing scripted run is not evidence of model accuracy.

Live use sends questions and retrieved fictional source content to GitHub Copilot and consumes your account allowance. Keep exercise data fictional. The service origin is fixed to literal loopback HTTP; redirects, oversized responses and long waits are rejected. This workshop runs one API process per database and does not implement production authentication or distributed ownership.

## From workshop evidence to product provenance

This session checks source authority and freshness at retrieval and submission. The final product also binds evidence to immutable source versions and rechecks access rights before reuse. A cache hit or unchanged content hash cannot renew an observation or restore revoked access. Future context and artifact generation must record exact source, context, decision and guardrail revisions. These are later product contracts, not capabilities implemented by this workshop. Bun 1.4.0 remains the runtime for the API, adapters and evaluation tools.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.

## Session 3 local storage

Use this folder’s own `.env.local` and SQLite application file by default; PostgreSQL remains explicit. Follow [SQLite setup](../../../QUICKSTART-SQLITE.md). Earlier tools and workflows are supplied complete. Keep application, test, evaluation and demonstration storage separate, and preserve the same application file when checking restart persistence. Storage selection does not change the four exercises or evidence policy.
