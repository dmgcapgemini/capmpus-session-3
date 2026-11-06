# Session 3 — SQLite setup

The full starter contains completed Session 1 tools and Session 2 workflows. Extract it into a fresh `session-03/` folder; no earlier application, learner implementation or database is required. Keep previous folders and data. Install Git, Bun 1.4.0 and Copilot CLI, and sign in with `copilot login`. SQLite needs no database server or containers.

## 1. Configure this application

Run all commands from the new application folder:

```bash
cp .env.example .env.local
```

The default settings are:

```dotenv
DATABASE_URL=sqlite:./.loom/session-03.sqlite
LOOM_SOURCES_DIR=examples/session-03
LOOM_FMS_URL=http://127.0.0.1:3010
```

Leave `DATABASE_URL_TEST` unset to derive `.loom/session-03_test.sqlite`, or explicitly select a different file. Relative paths resolve from this application's root. On macOS, apply any `LOOM_COPILOT_CLI_PATH` advice from preflight. Keep `.env.local` private.

## 2. Prepare before class

```bash
bun install --frozen-lockfile
bun run db:migrate
bun run db:seed
bun run preflight
bun run typecheck
bun run lint
bun run test
bun run build
```

Only the exact fourteen failures in `docs/course/session-03/workshop-tests.json` are expected in the starter. The four exercises are joined records, evidence policy, conflicts and FMS registration. Earlier tools, workflow guards, replay, recovery and human review are already implemented. SQLite document search is supplied baseline functionality.

## 3. Start the application

In one terminal run:

```bash
bun run mock:fms normal
```

In another terminal, from the same folder:

```bash
bun run dev
```

The browser normally opens at `http://localhost:5173`. Stop earlier session servers if their ports conflict. The external FMS remains a local HTTP mock; SQLite does not replace it.

## 4. Keep storage separate

Runs, workflow audit, knowledge reports, answers and diagnostics persist in `.loom/session-03.sqlite`. Preserve that file and its `-wal`/`-shm` companions across restart demonstrations. Tests use `_test.sqlite`. `bun run eval:knowledge scripted` uses a separate `_eval.sqlite` file and must pass ten cases after the exercises. Evaluation makes no model requests in scripted mode.

For `bun run demo:knowledge` or `bun run demo:workflow`, select `DATABASE_URL=sqlite:./.loom/session-03_demo.sqlite` in this folder's private environment. Stop the ordinary API first, retain the same demo file across restarts, then restore the ordinary URL. Use one API process per database. Never point tests or evaluation at ordinary application storage.

## 5. Optional PostgreSQL

PostgreSQL 17 remains explicitly selectable following `QUICKSTART.md`; use a separate `loom_session03` database. Connection failures never switch storage automatically. Earlier records are not copied or converted. [Guía en español](QUICKSTART-SQLITE.es.md).
