# Session 1 — Troubleshooting

## Diagnose the failing boundary

Start with `bun run preflight`. Check the Errors tab, Tool calls and the API log. Distinguish an environment failure, a policy denial, invalid tool arguments and a missing workshop implementation.

| Symptom | Action |
|---|---|
| Copilot is not authenticated | Follow `PREREQUISITES.md`; sign in with `copilot login`, then repeat preflight |
| macOS CLI works but the bundled runtime is not signed in | Set `LOOM_COPILOT_CLI_PATH` as preflight recommends |
| Database connection refused | Start the existing PostgreSQL container and check the port in your local configuration |
| SQLite file cannot be opened | Select a writable directory in `DATABASE_URL`; follow `QUICKSTART-SQLITE.md` and rerun migration/preflight |
| Database schema is missing | Run `bun run db:migrate` against your session database |
| A second run returns 409 | Stop or finish the active run; one run per API process is supported |
| Agent cannot use the three tools | Complete session registration; keep the available-tool and permission restrictions |
| Source read reports a TODO | Complete the source-boundary exercise |
| Valid analysis is not stored | Complete the persistence exercise; inspect the tool's feedback |
| Evidence is rejected | Read the source first and copy an actual quotation from that source |
| Tool call is denied | Read the stated rule; fix the sequence or stop after budget exhaustion |
| Run ends incomplete | The runtime became idle without a stored result; inspect tool failures and instructions |
| Provider error or timeout | Record the failure; check authentication and network before deliberately starting another run |
| Old trace is unavailable | Results persist, but Session 1 traces are bounded and lost after an API restart |
| Lockfile installation fails | Keep the pinned dependencies and report the failure to the facilitator |

## Escalation evidence

Share the failed command, error category, run ID and relevant sanitised event. Do not share tokens, passwords or `.env.local`. Never disable validation, permissions or tests to bypass a failure.
