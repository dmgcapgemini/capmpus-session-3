# ADR 0012 — Heterogeneous knowledge and evidence policy

Status: accepted

Date: 2026-09-15

## Context

Session 3 must distinguish document questions, exact relational facts and current fleet observations. A plausible answer without auditable provenance is insufficient. The four-hour workshop needs deterministic exercises and a separate measurement of live model source selection.

## Options

1. One broad search or arbitrary SQL/HTTP tool: simple surface, but hides source choice and expands access.
2. An embedding pipeline over all data: adds infrastructure and blurs relational identity and operational freshness.
3. Typed adapters with source-specific tools, common evidence, deterministic eligibility and curated conflicts.

## Decision

Use option 3. PostgreSQL indexes Markdown with English full-text search. Parameterised relational queries join driver/licence and location/customer tables. A simulated FMS runs on literal loopback HTTP and validates responses with Zod. The adapter rejects redirects, responses beyond 16 KiB and waits beyond 1.5 seconds.

Search refinement, 2026-09-17: preserve the existing full-text query first. If an ordinary multiword keyword query has no matches, retry partial matching and retain only candidates with the greatest number of distinct matching query lexemes. Rank those candidates by full-text relevance, then document ID, and return at most six. This tolerates absent descriptive words without including every document sharing an incidental term. Quoted phrases, exclusions and explicit operators are never relaxed. The tool description makes partial matching explicit; source relevance still needs assessment and all evidence eligibility rules remain unchanged.

Evidence records observation time separately from retrieval time. Reject unverified authority, timestamps more than five seconds ahead, and ages beyond 365 days for documents, 7 days for records or 120 seconds for FMS. These are explicit workshop budgets. Apply eligibility both before tool output and at answer submission.

Compare normalised curated claim values across sources. Store all resulting conflicts with the answer. Enforce known references and exact quotations from still-eligible query evidence. Allow an empty answer only with explicit uncertainty. Keep one answer per query and append retrieval reports atomically in PostgreSQL. Knowledge queries share the invocation concurrency boundary with earlier workflows but do not approve them.

Provide scripted and live evaluation modes. Only scripted mode receives fixture tool calls; live mode receives the question. Report actual adapters, citations, conflicts, rejected sources and failures. A scripted pass measures plumbing, not model accuracy.

## Consequences

The existing database and dependency pins suffice. The derived starter retains document search and the mock but stubs joined lookup, eligibility, conflicts and FMS tool registration. Historical workflow behaviour stays implemented.

Fixtures deliberately preserve domain contradictions; relative observation ages are simulation metadata. Curated claims do not detect arbitrary prose contradictions, and exact quotations do not guarantee semantic entailment. A single API per database, fictional inputs and local service are workshop constraints. Production identity, distributed workers, semantic conflict reasoning and real external integration remain later decisions.
