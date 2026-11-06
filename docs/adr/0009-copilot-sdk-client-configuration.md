# 0009 — Copilot SDK client configuration

- **Status:** accepted
- **Date:** 2026-09-13

## Context

Loom uses the GitHub Copilot SDK (`@github/copilot-sdk`) as its agent runtime. The SDK starts a Copilot runtime process and supports two client modes:

- `copilot-cli`: defaults equivalent to the Copilot CLI, including ambient features such as custom instruction files (`AGENTS.md`, `.github/copilot-instructions.md`), memory, a cross-session store and bundled skills. Authenticates with the signed-in user's `copilot login` or a token.
- `empty`: all optional features off; requires an explicit tool list and a base directory. Intended for servers. Does not read stored `copilot login` credentials, so it needs a token.

In a proof run, a session restricted with `availableTools` exposed only Loom's three tools, validation failures returned to the agent were corrected, and the agent executed no other tool.

## Decision

`packages/agent-runtime` creates the client in one of two configurations, selected by the environment:

| | Workshop default | Production shape |
|---|---|---|
| When | `LOOM_GITHUB_TOKEN` not set | `LOOM_GITHUB_TOKEN` set |
| Client mode | `copilot-cli` | `empty` |
| Authentication | member's `copilot login` | fine-grained token with Copilot Requests permission |
| Base directory | default Copilot home | `.loom/copilot-home` (gitignored) |

Every session, in both configurations:

- `availableTools` lists only Loom's tools for that session;
- `onPermissionRequest` approves only those tools and rejects everything else with feedback;
- `skipCustomInstructions: true`, `enableOnDemandInstructionDiscovery: false`, `enableFileHooks: false`, `enableConfigDiscovery: false`;
- `enableSkills: false` and `includedBuiltinSkills: []`;
- `memory: { enabled: false }`, `enableSessionStore: false`, `enableHostGitOperations: false`, `skipEmbeddingRetrieval: true`;
- `infiniteSessions` disabled (runs are bounded tasks);
- Loom's instructions are passed through `systemMessage` in `customize` mode with the `environment_context` section removed, so no host paths or git state reach the model;
- all session events are forwarded to Loom's event mapper.

This option set was verified in the [spike follow-up runs](../reference/copilot-spike-follow-up.md#follow-up-runs-on-macos): without it, instruction files from the working directory, the host environment and two bundled skills reached the agent; with it, none did. Tests assert on the system prompt in the `system.message` event, not on `instructions.getSources()`, which lists discovered files even when they are not injected.

Versions of `@github/copilot-sdk` and its bundled runtime are pinned exactly and change only between sessions.

**Runtime path.** By default the SDK's bundled runtime is used. `LOOM_COPILOT_CLI_PATH`, when set, is passed through as `COPILOT_CLI_PATH` to use the installed Copilot CLI instead. This is needed on macOS, where the bundled runtime cannot read the `copilot login` stored in the keychain (observed with SDK 1.0.13).

`bun run preflight` calls `getAuthStatus()`. When not authenticated, it explains `copilot login` or `LOOM_GITHUB_TOKEN`; on macOS, when the installed CLI is signed in but the bundled runtime is not, it tells the participant to set `LOOM_COPILOT_CLI_PATH`. It always prints the runtime path and version.

## Consequences

- Participants authenticate once with `copilot login`; no tokens are handled in the workshop.
- Loom's restrictions do not depend on the client mode: the tool list, permission handler and disabled features are explicit in code and covered by tests.
- The token-based configuration is available for the production-readiness discussion in Session 10.
- An authentication problem otherwise surfaces only at the first model call; the preflight check prevents that during sessions.
- On macOS with `LOOM_COPILOT_CLI_PATH`, the runtime version follows the participant's installed CLI rather than the pinned SDK runtime (1.0.84 against 1.0.83 in the spike). Session material states the minimum CLI version, and the preflight output makes the actual version visible. Revisit when an SDK upgrade fixes keychain access for the bundled runtime.
- The Bun workspace sets `trustedDependencies: []` to disable dependency lifecycle scripts. The unused in-process `koffi` transport does not require an install script for Loom's stdio transport. Native dependencies must provide their platform packages without silently enabling install scripts; see ADR 0013.
