import { resolve } from "node:path";
import { type CopilotClientOptions, RuntimeConnection } from "@github/copilot-sdk";
import type { LoomConfig } from "@loom/config";

export type ClientProfile = "workshop" | "production";

export type ResolvedClient = {
  profile: ClientProfile;
  options: CopilotClientOptions;
  /** What the runtime process is, for display: an explicit CLI path or the SDK-bundled runtime. */
  runtime: string;
};

/**
 * Chooses the Copilot client configuration from Loom's configuration (ADR 0009):
 * - no token: "copilot-cli" mode with the member's own `copilot login`;
 * - token: server-safe "empty" mode with an isolated base directory.
 * LOOM_COPILOT_CLI_PATH replaces the bundled runtime with the installed Copilot CLI.
 */
export function resolveClientOptions(
  copilot: LoomConfig["copilot"],
  options: { workspaceRoot?: string } = {},
): ResolvedClient {
  const connection = copilot.cliPath ? RuntimeConnection.forStdio({ path: copilot.cliPath }) : undefined;
  const runtime = copilot.cliPath ?? "bundled with @github/copilot-sdk";
  const shared: CopilotClientOptions = { logLevel: "warning", ...(connection ? { connection } : {}) };

  if (copilot.gitHubToken) {
    return {
      profile: "production",
      runtime,
      options: {
        ...shared,
        mode: "empty",
        gitHubToken: copilot.gitHubToken,
        baseDirectory: resolve(options.workspaceRoot ?? process.cwd(), ".loom/copilot-home"),
      },
    };
  }

  return { profile: "workshop", runtime, options: { ...shared, mode: "copilot-cli" } };
}
