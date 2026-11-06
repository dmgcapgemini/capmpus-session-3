# Loom Campus — Installation on macOS and Linux

Install on the computer and network you will use for the workshop. Sessions 1, 2 and 3 support SQLite without containers; PostgreSQL and Podman are optional.

## 1. Git and archive tools

On macOS, install Git with your organisation's approved installer or Homebrew. Git, tar and unzip must be on PATH. On Ubuntu/Debian Linux:

```bash
sudo apt-get update
sudo apt-get install git curl unzip tar
```

Other Linux distributions use their package manager's equivalent packages. Automated verification targets Linux x64 and macOS Apple Silicon; additional architectures need their own workstation verification.

## 2. Bun

The course pins Bun **1.4.0**. If that version is already installed, keep it. Otherwise use the [official versioned installer](https://bun.com/docs/installation#installing-older-versions):

```bash
curl -fsSL https://bun.com/install | bash -s "bun-v1.4.0"
```

Open a new terminal. Check `bun --version` returns `1.4.0`. Do not upgrade Bun or regenerate the lockfile during a session.

## 3. Copilot CLI

Use your organisation's approved installation or the [official Copilot CLI installation guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli). On macOS, Homebrew provides `brew install --cask copilot-cli`. The official install script also supports Linux.

The recorded Session 1 runtime versions are 1.0.83 and 1.0.84-5. Record `copilot --version`; a different version requires workstation/live verification before delivery. The instructor doctor reports this difference. Do not automatically upgrade an instructor's existing CLI.

```bash
copilot --version
copilot login
copilot -p "Reply with the single word OK."
```

Use your licensed GitHub account. Verify sign-in and the real request on the course network. This request consumes a small amount of Copilot allowance.

On macOS, set `LOOM_COPILOT_CLI_PATH` to your installed CLI when preflight requests it. Instructor workspace preparation detects the installed path on both platforms without changing your global installation.

## 4. Session 1 setup

Participants import the facilitator's ZIP into the team repository and follow `QUICKSTART-SQLITE.md` (or its Spanish version). Application and test databases must be separate files.

Instructors use the master repository's `course/INSTRUCTOR.md`. Preparation, running and distribution are independent operations. A local run does not require a release tag.

## 5. PostgreSQL route and later sessions

Install Podman using its [official platform instructions](https://podman.io/docs/installation), then follow `QUICKSTART.md`. On macOS, initialise and start the Podman machine before starting the database container. SQLite is supported for Sessions 1, 2 and 3.

## 6. Ready

Check Git, Bun, archive tools and Copilot, a writable local data directory, free application ports, and registry/GitHub access on the course network. Then migrate, seed and run preflight in that order. The participant starter has exactly 13 named workshop failures; complete instructor tests must all pass.

## 7. Before every session

Each session arrives as a full starter ZIP. Add it to a fresh `session-NN/` folder, keep earlier work, and open the new application folder in your editor. The starter includes the earlier reference implementations; your changes and database history do not transfer automatically.

Before class, follow QUICKSTART.md in the supplied ZIP: create that folder's own `.env.local`, prepare separate application/test storage, install frozen dependencies, migrate, seed and run preflight, typecheck, lint, tests and build. Sessions 1, 2 and 3 default to SQLite; PostgreSQL is optional. Setup finishes before the four-hour workshop. Only the named exercise tests may fail: 13 / 10 / 14 in Sessions 01 / 02 / 03. See SESSION-START.md in the ZIP for the delivery diagram.
