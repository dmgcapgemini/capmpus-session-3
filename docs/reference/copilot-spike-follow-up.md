# Copilot SDK: historical macOS verification

These results were recorded on 2026-09-13 for the original Node.js/pnpm spike. They explain the Session 1 SDK decision and keychain behavior; they do not certify the current Bun package or CLI installation. The current runtime decision is [ADR 0013](../adr/0013-bun-runtime-and-toolchain.md). The throwaway spike source is maintained in the instructor master and is not distributed.

## Follow-up runs on macOS

Recorded on 2026-09-13, macOS arm64, Node.js v24.12.0, `@github/copilot-sdk` 1.0.13, `copilot-cli` mode with the stored `copilot login`.

### Hardened `copilot-cli` run — closed

Session options used: `availableTools` (Loom tools only), permission handler, `skipCustomInstructions`, `enableOnDemandInstructionDiscovery: false`, `enableFileHooks: false`, `enableConfigDiscovery: false`, `enableSkills: false`, `includedBuiltinSkills: []`, `memory: { enabled: false }`, `enableSessionStore: false`, `enableHostGitOperations: false`, `skipEmbeddingRetrieval: true`, `infiniteSessions: { enabled: false }`, and `systemMessage` in `customize` mode with the `environment_context` section removed.

| Check | Unhardened (`LOOM_HARDEN=0`) | Hardened |
|---|---|---|
| Only Loom tools available / no other tool executed | pass | pass |
| Instruction file injected into the system prompt | **yes** (canary text present) | no |
| Host environment (`<environment_context>`: working directory, git state, user path) in the system prompt | **yes** | no |
| Skills enabled | **`customize-cloud-agent`, `github-pr-media`** | none |
| Agent followed the canary instruction | yes | no |
| Out-of-bounds read `../../.env` | model refused before calling a tool | **handler rejected it** (`Unknown sourceId`) |
| All checks | 4 fail (as intended) | **15 / 15 pass** |

Hardened run: session created in 1.2 s, task 14.9 s, 8 model calls, 33.1k input and 1.8k output tokens. The quotation-across-a-line-break rejection and correction happened again in both runs, so it is a reliable demonstration for Session 1.

Findings:

1. **`copilot-cli` mode sends the full Copilot coding-agent system prompt.** Loom's instructions are appended to it, and it contains an `<environment_context>` section with the host working directory and git state. `empty` mode removes that section automatically; in `copilot-cli` mode Loom must remove it explicitly (`systemMessage: { mode: "customize", sections: { environment_context: { action: "remove" } } }`). Whether to replace the coding-agent prompt entirely is a Session 1 design question.
2. **`session.rpc.instructions.getSources()` reports what was discovered, not what was injected.** It listed the canary file even when hardened. The system prompt in the `system.message` event is the evidence to test against.
3. **Bundled skills are on by default in `copilot-cli` mode**; `enableSkills: false` turns them off.
4. Memory and the session store are disabled by configuration; this run has no independent observation of either.

### Stored login and the bundled runtime on macOS — new finding

On macOS the SDK's bundled runtime (`@github/copilot-sdk-darwin-arm64`, 1.0.83) does **not** see the `copilot login` stored in the login keychain: `getAuthStatus()` returns not authenticated and the first model call fails with `No GitHub OAuth token or Copilot HMAC key provided`. This happens inside and outside a sandboxed shell. The installed Copilot CLI reads the same keychain item without problems, and pointing the SDK at it with `COPILOT_CLI_PATH` authenticates immediately.

Likely cause: macOS keychain items carry a per-application access list, and the bundled `copilot-runtime` binary is a different application from the `copilot` binary that stored the login. The Linux Secret Service has no such list, which is why the original run worked. Not tested: granting the bundled runtime access through Keychain Access.

Consequence: with `COPILOT_CLI_PATH`, the runtime version is that of the installed CLI (1.0.84-5 here), not the version pinned by the SDK. See [ADR 0009](../adr/0009-copilot-sdk-client-configuration.md).

### `koffi` under pnpm — closed

`pnpm install` reports `Ignored build scripts: koffi@3.2.1`. This is harmless: koffi loads from its prebuilt platform package (`@koromix/koffi-darwin-arm64`) without the install script, the SDK starts and authenticates the same as under npm, and koffi is only used by the in-process FFI transport, not by the default stdio transport. The reference workspace should acknowledge the script explicitly so the warning does not confuse participants.

### Deferred

- [ ] `empty` mode with a fine-grained token, end to end. By design this mode never reads the stored login, so it cannot be verified with local authentication alone. Not needed for the workshop default; moved to Session 10 preparation (production configuration).

