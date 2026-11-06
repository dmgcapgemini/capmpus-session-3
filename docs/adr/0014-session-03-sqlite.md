# ADR 0014 — Session 3 local SQLite delivery

Status: accepted. Date: 2026-10-28.

Session 3 defaults to a persistent Bun SQLite file and retains explicitly selected PostgreSQL. It contains the completed earlier tools and durable workflows; no earlier application folder or database is required. Database failures never silently switch backends. Keep one API process per database and separate application, test, evaluation, hidden-check and demonstration storage.

SQLite migrations preserve the five logical migration names and domain constraints. The persistence adapter normalizes timestamps and JSON, including observation times, reports, answers and run diagnostics. SQLite serializes local transactions; PostgreSQL retains row locks. Workflow versions, audit atomicity, replay and human-only review retain their existing contracts.

PostgreSQL keeps its English text vector and GIN index. SQLite uses an external-content FTS5 index with Porter/unicode tokenisation, maintained by document insert/update/delete triggers. Its shared `search` column is an unused compatibility field; index state lives in the FTS tables. Search translates the supplied word/phrase/operator contract into parameterised FTS queries, preserves explicit queries and only relaxes empty ordinary keyword queries to strongest distinct keyword coverage. Engine-specific numeric scores are not compared; evidence selection, ordering ties and the six-document bound are tested. FTS auxiliary tables are implementation details rather than domain tables.

SQLite retrieval reports append in one JSON SQL update. Answer storage remains conditional on an empty answer, and malformed JSON or broken foreign keys is rejected. Evaluation derives a separate `_eval.sqlite` file; demonstrations require `_demo.sqlite` or `_demo.db`. Preserve the same demonstration file during a restart.

Copilot continues to select typed sources and propose answers. Loom owns validation, evidence eligibility, conflicts, diagnostics and persistence. The four current exercises and fourteen named starter failures are unchanged. No arbitrary SQL/HTTP or workflow approval tools are introduced. Embeddings, distributed workers, production integrations and cross-session data transfer remain outside this workshop.
