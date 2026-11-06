# Session 2 — Build the durable process

Start with [the introductory reader](INTRODUCTION.md) for the purpose of this session and its relationship to Loom.

Goal: a failed or interrupted invocation can resume, one analysis is applied once, and only a human decision accepts it. Use [theory](THEORY.md) and finish with [validation](VALIDATION.md).

## Before the session

Before class, add the Session 2 full starter to a fresh `session-02/` folder following QUICKSTART.md and run all commands inside it. The supplied baseline includes the completed Session 1 reference implementation; keep your own previous work for comparison. Use Bun 1.4.0 and SQLite by default; PostgreSQL 17 remains an explicit option. Create this folder's own `.env.local` from `.env.example`, with `DATABASE_URL=sqlite:./.loom/session-02.sqlite` (or a separate PostgreSQL database such as `loom_session02`) and `LOOM_SOURCES_DIR=examples/session-02`. Retain earlier SQLite files; their history is not transferred. Installation and storage setup are outside the four-hour schedule. The four current exercises are taught in three blocks. Then run:

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
```

Type checking and linting must pass. Compare failing test names with [the workshop manifest](workshop-tests.json); every other test must pass. Do not change tests to make the starting point green.

## Four-hour schedule

| Segment | Minutes |
|---|---:|
| Opening failure/restart demonstration | 20 |
| Two loops, state diagram and transaction walkthrough | 35 |
| Block 1: guards and audit | 45 |
| Break | 10 |
| Block 2: idempotency and recovery | 65 |
| Block 3: human review | 40 |
| Validation and team explanation | 25 |
| Total | 240 |

## Block 1 — Guard transitions

Open `packages/persistence/src/workflows.ts`. Implement `assertWorkflowTransition` using the transition table. Reject an illegal edge with a conflict before updating anything. Study how the repository checks the expected version and commits the state update and event together; those parts are already supplied.

SQLite serializes transactions through the local application connection; PostgreSQL takes row locks. Both retain expected-version checks and atomic audit writes. Run the workflow repository tests. Demonstrate that acceptance cannot start from a newly created workflow, a terminal decision cannot be reversed, and a stale version changes neither state nor history. Explain why the audit rollback test uses a real database failure.

```bash
bun --bun run vitest run --project integration packages/persistence/src/workflows.int.test.ts
```

## Block 2 — Apply once and recover

In `workflowResultStore`, handle an existing result before inserting. Return its ID only when the stored analysis equals the repeated analysis; reject a changed payload. Keep the binding and stale-attempt checks. Do not weaken source or evidence validation.

In `apps/api/src/workflows/service.ts`, implement startup recovery. Load pending workflows and make their IDs eligible for this worker. Move committed proposals to review. Fail interrupted analyses whose attempt budget is exhausted. Pending analyses with budget remain eligible for a new invocation. The run service marks interrupted runs before this method is called.

Run both workflow test files. Observe separate run IDs under one workflow and the bounded attempt count. Explain the difference between a crash before and after the proposal transaction commits.

```bash
bun --bun run vitest run --project integration workflows.int.test.ts
```

## Block 3 — Human review

In `apps/api/src/workflows/routes.ts`, implement the accept and reject endpoints. Use the supplied parameter and request schemas; pass the expected version, decision and reason to the repository. Return the updated workflow. Keep review out of the registered tool list.

The paths are `POST /api/workflows/:id/accept` and `POST /api/workflows/:id/reject`. Request bodies contain `version` and `reason`. A stale decision must return a conflict. Run the HTTP review test, then accept one proposal and reject another in the browser. Inspect the decision event and try a stale request.

## Repeatable failure and restart demo

Complete the exercises before this demonstration. Stop the normal API first. In the terminal used for the fixture API, set `DATABASE_URL=sqlite:./.loom/session-02_demo.sqlite`, or select a separate PostgreSQL database named `loom_session02_demo` with your local connection details. Keep the same API port that the web proxy expects. The fixture creates and migrates this demo database without clearing it.

```bash
bun run demo:workflow fail-once
```

In another terminal start the web application:

```bash
bun run --filter @loom/web dev
```

Start a workflow. The first invocation fails; the next stores a proposal twice with one result ID and attempts an acceptance tool that Loom denies. The workflow waits for your decision. Inspect both attempts and their history. Stop the fixture API and restart it in hold mode:

```bash
bun run demo:workflow hold
```

Start a new workflow and wait for its state to become analysing. Record its ID and the PID printed by the fixture server. In a separate terminal, terminate only that fixture process:

```bash
kill -9 <printed-fixture-pid>
```

Restart against the same demo database:

```bash
bun run demo:workflow succeed
```

Refresh the browser. The same workflow resumes with an increased attempt count and reaches review. Earlier workflow history remains. Old raw agent traces may be unavailable. Use `fail-always` mode with a new workflow to demonstrate bounded failure.

## Finish

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

Restore the normal session database setting, stop the fixture server and use `bun run dev` for a real Copilot workflow. Submit your changes through the team's normal review process. Record the workflow ID, failed attempt, recovery history, duplicate result ID and human decision in your validation evidence.
