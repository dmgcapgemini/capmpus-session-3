# Loom Campus — Team Quick Start

Every session arrives as a **full starter ZIP**. Extract it into a **fresh session folder** and work there. It already includes the earlier reference implementations; your team's previous code and database history are not transferred automatically. Keep earlier work for comparison. Carrying selected improvements forward is optional work after class.

Complete installation, local database setup and baseline checks **before the four-hour workshop**. Start with [the one-page session-start guide](SESSION-START.md). [Guía en español](QUICKSTART.es.md).

## 1. What you receive

The instructor shares one verified full starter, such as `session-03.zip`. Its actual filename may include a release revision. Use the exact archive assigned to your team.

| Content | Purpose |
|---|---|
| `apps/`, `packages/`, `tools/` | Runnable application with only the current exercises unfinished |
| `docs/course/session-NN/` | Introduction, theory, workshop, self-study and validation |
| `examples/session-NN/` | Source material and fictional data |
| `.env.example` | Settings to copy into your own private `.env.local` |
| `SESSION.json` | Identity of the supplied session release |

Sessions 01–03 have prepared starters. Later-session starters are supplied when their materials are ready. Keep `SESSION.json` unchanged. Course access uses your team's Git host; Copilot uses your own licensed GitHub account.

## 2. Add the new folder once per team

One member is the **integrator**: they add the supplied starter to the team's shared Git repository on a review branch. Everyone else pulls the reviewed result. The repository can be hosted on GitHub, Azure DevOps, GitLab or another service; use its equivalent of a pull request.

For a new team, clone its repository once:

```bash
git clone <TEAM_REPOSITORY_URL> loom
cd loom
```

For an existing team, enter its existing repository. Finish or commit current source edits before switching branches. The example below starts Session 3; use the exact ZIP filename assigned by the instructor.

```bash
git switch main
git pull
git switch -c start/session-03
test ! -e session-03
unzip -q ~/Downloads/session-03.zip -d session-03
git add session-03
git commit -m "Add Session 3 full starter"
git push --set-upstream origin start/session-03
```

Run these commands one at a time. If `test` fails, stop: that folder already exists. Keep it and ask the instructor which fresh folder to use. Review and merge the pull request, checking that it adds the new session folder and includes no private files.

The usual layout is:

```text
loom/                         Team Git repository
├── session-01/               Previous work
├── session-02/               Fresh Session 2 application
└── session-03/               Added when Session 3 begins
```

If Session 1 already occupies the repository root, keep those files there and add `session-03/` alongside them. No rearrangement of Session 1 is required. Each session folder is its own application: open that folder in the editor and run its commands there.

## 3. Each member opens the new session

After the starter pull request is merged, every member runs these from their repository root:

```bash
git switch main
git pull
cd session-03
```

At this point you have the supplied starting code. You have not imported or merged the team's previous exercise implementations. Previous exercise completion remains a learning goal, but it does not block opening the next starter.

## 4. Prepare local storage before class

**Sessions 1, 2 and 3:** use [SQLite setup](QUICKSTART-SQLITE.md) for the default container-free route. With SQLite, skip the PostgreSQL commands in this section and go to section 5. All three sessions also support the explicit PostgreSQL route below. **Session 3:** SQLite is the default; PostgreSQL 17 is optional.

For PostgreSQL, start Podman. On macOS, start its already-initialised machine first:

```bash
podman machine start
```

Create the local database container once:

```bash
podman volume create loom-postgres-data
podman run --name loom-postgres \
  --detach \
  --publish 5432:5432 \
  --env POSTGRES_USER=loom \
  --env POSTGRES_PASSWORD=loom-dev \
  --env POSTGRES_DB=loom \
  --volume loom-postgres-data:/var/lib/postgresql/data \
  docker.io/library/postgres:17
```

On subsequent starts use `podman start loom-postgres`. Check readiness:

```bash
podman exec loom-postgres pg_isready -U loom
```

Create a **separate application database for the current session**, once:

```bash
podman exec loom-postgres createdb -U loom loom_session03
```

Use `loom_session01` or `loom_session03` for those sessions. These are local development credentials. Tests use a separate database with `_test` appended, created by the test setup; your local account needs permission to create it. Retain earlier session databases and SQLite files. Starting a new session does not copy or convert their records.

## 5. Configure and check the fresh application

From the new session folder, create its private settings once:

```bash
cp .env.example .env.local
```

Use the supplied example for this session. For the default Session 3 SQLite route, check:

```dotenv
DATABASE_URL=sqlite:./.loom/session-03.sqlite
LOOM_SOURCES_DIR=examples/session-03
```

For the optional Session 3 PostgreSQL route, set `DATABASE_URL=postgresql://loom:loom-dev@localhost:5432/loom_session03` after creating that database. For Session 3, keep the default `sqlite:./.loom/session-03.sqlite` or explicitly select `loom_session03` on PostgreSQL. Set `LOOM_SOURCES_DIR=examples/session-03` and retain the supplied FMS settings. Apply any workstation-specific CLI path advised by preflight. Keep `.env.local` private; do not copy the previous session's file wholesale.

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

Use Bun **1.4.0** and `bun run test` to select the configured Vitest projects. Typecheck, lint and build must pass. In a fresh starter, only the named tests in `docs/course/session-NN/workshop-tests.json` fail:

| Session | Expected exercise failures |
|---|---:|
| 01 | 13 |
| 02 | 10 |
| 03 | 14 |

Report any other failure before class. A starter is runnable while its current exercises remain unfinished. Start with `bun run dev`; Session 3 also needs `bun run mock:fms normal` in another terminal. Stop the previous session's servers first so their ports are available. Verify Copilot sign-in and one real workflow with the instructor before delivery; automated checks alone do not establish live readiness.

## 6. Work together during the session

From the repository root, create a small exercise branch, then enter the current application folder. Commit source changes and use the team's normal pull-request review. After a teammate changes dependencies or migrations, pull their changes and rerun the install/migration commands inside that session folder.

Keep local environments, databases, dependency folders and runtime reports out of Git. Preserve tests and pinned dependencies. At the end, record completed exercises and validation evidence. The next session supplies a fresh reference checkpoint; optional improvements from previous work can be reviewed after class.

## 7. If setup fails

| Symptom | Next step |
|---|---|
| Session folder already exists | Preserve it; choose a fresh folder with the instructor |
| Wrong or extra failing tests | Check current folder, Bun version and workshop manifest; report the output |
| PostgreSQL unavailable | Start Podman and the existing container; check the configured port |
| Session database missing | Create that session's named database, then migrate and seed |
| Copilot sign-in fails | Run `copilot login` and follow preflight's CLI-path guidance |
| Frozen install fails | Preserve the lockfile and flag; ask the facilitator for help |
| Wrong schema or source inventory | Check the new folder's own `.env.local` and session-specific database |

Preserve the failing folder and its data while the instructor diagnoses it. If another clean start is needed, extract the same verified full starter into another unused folder. The workshop's own restart demonstrations still operate on the same current-session database; cross-session data transfer is a separate optional activity.
