# Session 3 — Independent practice

Complete [the workshop](WORKSHOP.md) first. Keep the same fictional domain and source contracts. This four-hour exercise extends your reasoning and evidence, not the scope of accepted business decisions.


As a design exercise, describe what must happen if cached evidence keeps the same content hash but expires or loses access permission. List the immutable input versions a later artifact would need for traceability; do not add a cache or identity system to this exercise.
## Four-hour plan

| Activity | Minutes |
|---|---:|
| Review a query end to end | 30 |
| Add an unseen question and expected source | 45 |
| Exercise external failure and freshness | 45 |
| Break | 10 |
| Challenge conflict and citation boundaries | 45 |
| Compare scripted and live selection | 40 |
| Write review evidence | 25 |
| Total | 240 |

## Trace the boundary

Follow one question through its HTTP route, run service, source tool, adapter, retrieval report and answer submission. Draw where policy runs and where data becomes durable. Explain what remains after restart and what raw trace information may disappear.

## Add an unseen question

Create one new question using existing fixture facts. Before execution, record the expected adapters, eligible evidence, conflicts and rejected sources. Add it to a local copy of `examples/session-03/questions.json` using the existing schema. Keep `calls` as scripted fixture instructions, not model input. Explain why querying every adapter would fail the source-selection metric even if it found a valid quotation.

## Exercise failure and age

Use the FMS mock with `normal`, `stale`, `failure` and `slow` modes. Configure `LOOM_FMS_DELAY_MS` and `LOOM_FMS_AGE_SECONDS` for boundary experiments. Stop the previous mock before restarting on the same port. Predict which side of the 120-second boundary passes, including elapsed time between retrieval and submission.

Record how an unavailable source differs from a successful retrieval rejected by policy. Do not convert either into a fabricated operational status. Confirm that the answer can carry explicit uncertainty without citations when no eligible evidence exists.

## Challenge the evidence

Try repeated equivalent facts, whitespace/case variants and two values from one source. Explain which cases are conflicts and why. Attempt an unknown reference, a changed quotation, an expired reference and a duplicate answer submission through a focused test. Each must fail without replacing a stored answer.

Describe one plausible answer that quotes a real sentence but draws an unsupported conclusion. Explain why exact quotation validation cannot replace a semantic review. Do not claim the curated fact comparison understands arbitrary prose.

## Compare selection

Run scripted evaluation, then live evaluation if your account and course policy permit sending the fictional questions and retrieved content to GitHub Copilot. Compare actual adapter choices, evidence, conflicts and failures. Record the runtime/model, report path and run IDs. If live use is unavailable, mark it unexecuted; scripted success does not substitute for it.

## Deliver

Provide a small review note with the unseen question, predicted and observed results, boundary tests, a screenshot of provenance, and an explanation of one remaining limitation. Run the checks in [validation](VALIDATION.md). Avoid adding embeddings, a new remote integration or production identity to finish this exercise.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.

## Session 3 local storage

Use this folder’s own `.env.local` and SQLite application file by default; PostgreSQL remains explicit. Follow [SQLite setup](../../../QUICKSTART-SQLITE.md). Earlier tools and workflows are supplied complete. Keep application, test, evaluation and demonstration storage separate, and preserve the same application file when checking restart persistence. Storage selection does not change the four exercises or evidence policy.
