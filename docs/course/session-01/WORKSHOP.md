# Session 1 — Workshop

Start with [the introductory reader](INTRODUCTION.md) for the connection between Loom, the harness and the three workshops.

## Before the session

Follow the root `PREREQUISITES.md` and `QUICKSTART.md`. Import the session zip into your team's repository. Each member uses their own local database. Run these commands from the imported application root:

If containers or PostgreSQL are unavailable, follow the root `QUICKSTART-SQLITE.md` and set `DATABASE_URL=sqlite:./.loom/session-01.sqlite`. No separate database installation is needed. Tests use a separate file. This fallback is limited to Session 1.

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
bun run dev
```

The starting point builds and starts. Some tests intentionally fail: their full names appear in `docs/course/session-01/workshop-tests.json`. Any other failure is an environment or baseline problem to raise with the facilitator. Do not remove tests, change their assertions or upgrade dependencies.

The console initially cannot complete an analysis. Three TODO blocks remain. Read the source brief in `examples/session-01/solution-brief.md`; treat missing facts as questions.

## Facilitated schedule

| Time | Activity |
|---|---|
| 00:00–00:20 | Instructor demonstration: successful run, validation and denial |
| 00:20–01:05 | Theory: model, agent, harness, tools, skills and ownership |
| 01:05–01:25 | Walkthrough of the packages and execution path |
| 01:25–02:15 | Workshop 1: source access and input validation |
| 02:15–02:25 | Break |
| 02:25–03:10 | Workshop 2: session tools and instructions |
| 03:10–03:40 | Workshop 3: controlled persistence |
| 03:40–04:00 | Demonstration and review |

## Workshop 1 — Complete the source boundary

Open `packages/agent-tools/src/tools/read-source.ts`. The manifest registry and tool schema already exist. Implement the TODO in the handler:

1. Validate the received arguments with the existing schema.
2. Reject path-like values and unknown IDs with corrective failure messages.
3. Read only through the source registry.
4. Record a successful source ID in the run's read set.
5. Return the source ID, name, media type and content.

The stub's `void z` only keeps the supplied import valid until you use it; remove it when implementing the exercise. Do not add shell commands or direct filesystem access to the tool.

```bash
bun --bun run vitest run --project unit packages/agent-tools/src/tools/tools.test.ts
```

The source-boundary tests should pass. Persistence tests remain incomplete. Explain how a declared ID differs from a user-supplied path. Demonstrate an unknown ID and a traversal attempt through tests.

## Workshop 2 — Connect Copilot to Loom's tools

Open `packages/agent-runtime/src/session-config.ts`. Complete the registration TODO using the run's supplied tools and instructions. Inspect the existing available-tool list, permission handler, pre-tool hook and disabled ambient features; keep these controls in place.

```bash
bun --bun run vitest run --project unit packages/agent-runtime/src/session-config.test.ts
```

Use the console to start the default task. Inspect Context and Tool calls. The agent should read the brief, but the analysis still cannot be stored until Workshop 3. Stop a run rather than repeatedly retrying a known missing implementation. Each live run consumes your Copilot allowance.

Explain why registering a handler and restricting available tools are separate responsibilities. Show how a skill differs from one of these tools; enabling skills is not part of this exercise.

## Workshop 3 — Store a validated result

Open `packages/agent-tools/src/tools/submit-analysis.ts`. Schema and evidence checks already exist. Complete the persistence TODO:

1. Reject a second submission after a result has been stored for this run.
2. Save the validated analysis through the supplied result-store port, with the run ID.
3. Record the stored result ID in the run's tool state.
4. Return the existing successful result contract.

Do not bypass validation or access the database directly from the tool. The outer application decides the final run status.

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

All deterministic tests should now pass. Run the default analysis in the console and inspect the stored result and its evidence. Refresh the page and select the run from Recent runs to demonstrate persistence.

## Final demonstration

Use [VALIDATION.md](VALIDATION.md). Show a successful run, one rejected or denied operation, context, tool outcomes and a stored result. Explain why the model's final message does not itself update application state. Record one case where a direct model call is preferable.

A live denial is model-dependent. Use the deterministic policy tests to demonstrate enforcement reliably; the facilitator has a controlled live test as additional evidence. Never weaken the policy to make a run succeed.

## After the session

Follow [SELF-STUDY.md](SELF-STUDY.md). Commit your changes through your team's normal review process. Keep a record of completed and remaining exercises; the next session supplies a full starter in a fresh folder with the earlier reference implementations included. Finish these exercises for learning and comparison; their completion does not block opening Session 2. Session 2 also supports SQLite without containers; PostgreSQL remains optional.
