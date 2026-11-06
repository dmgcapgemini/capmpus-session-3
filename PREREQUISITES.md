# Loom Campus — Prerequisites

Complete this checklist on the machine you will use during the workshop, **on the network you will use during the workshop**, before Session 1. Before each later session, complete its full-starter setup in a fresh session folder and run its baseline checks before class.

If a step fails, tell your facilitator before the session starts.

## 1. Accounts and access

- [ ] You have a GitHub account.
- [ ] Your GitHub account has an active GitHub Copilot licence.
- [ ] You can access your team's shared Git repository and push a branch to it.
- [ ] You can open the team chat channel where session material is shared.

Your team repository may be hosted on GitHub, Azure DevOps, GitLab or elsewhere. Copilot works with your GitHub account regardless of where the repository lives.

## 2. Software

Install:

- [ ] Git
- [ ] Bun 1.4.0
- [ ] Podman for the PostgreSQL route; Sessions 1, 2 and 3 use SQLite by default
- [ ] GitHub Copilot CLI; record `copilot --version` and verify login/model access
- [ ] Recommended: a code editor with the Biome extension (formatting and linting)

The earlier Session 1 rehearsal recorded CLI versions 1.0.83 and 1.0.84-5. Other versions require a workstation login and real-model check before teaching. The instructor `campus doctor --strict` command rejects unrecorded versions.

Verify:

```bash
git --version
bun --version         # 1.4.0; must match the session's .bun-version
podman --version     # PostgreSQL route only
copilot --version
```

For the PostgreSQL route, on macOS also initialise and start the Podman machine:

```bash
podman machine init
podman machine start
```

For the PostgreSQL route, verify that Podman can run a container:

```bash
podman run --rm docker.io/library/postgres:17 postgres --version
```

## 3. Sign in to Copilot

Sign in once. Your credentials are stored securely on your machine:

```bash
copilot login
```

Verify that Copilot answers:

```bash
copilot -p "Reply with the single word OK."
```

- [ ] The answer is `OK`.

If you see `No authentication information found`, run `copilot login` again. If sign-in or the request is blocked, note the error message and tell your facilitator; your network or organisation policy may need a change.

On macOS, Loom must use your installed Copilot CLI to read this login from the keychain. `bun run preflight` detects this in each session and tells you which line to add to `.env.local`.

This check uses a small amount of your Copilot usage allowance, as will the workshop exercises.

## 4. Local resources

- [ ] At least 10 GB of free disk space.
- [ ] PostgreSQL route: port 5432 is free (no other PostgreSQL server running locally).
- [ ] Sessions 1/2/3 SQLite route: a writable directory is available for the local database files.

## 5. Ready

- [ ] All checks above pass.

Session-specific setup (database, environment file, installing the application) is described in `QUICKSTART-SQLITE.md` (Sessions 1, 2 and 3 default) or `QUICKSTART.md` (PostgreSQL) inside the session ZIP. macOS/Linux installation instructions are in `INSTALLATION.md`; `INSTALLATION.es.md` also covers Windows participant setup. The master instructor commands support macOS ARM and Linux x64.

Sessions 1, 2 and 3 default to SQLite with PostgreSQL as an option. Session 3 defaults to SQLite; PostgreSQL 17 is optional. Each session has its own private environment and separate application/test storage; earlier records are not transferred automatically. Use the session-start handout and QUICKSTART inside that session's ZIP.
