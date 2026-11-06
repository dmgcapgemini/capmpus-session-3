import { CopilotClient } from "@github/copilot-sdk";
import type { LoomConfig } from "@loom/config";
import { resolveClientOptions } from "./client-options.ts";

export type CopilotCheck = {
  profile: "workshop" | "production";
  runtime: string;
  runtimeVersion?: string;
  authenticated: boolean;
  login?: string;
  authType?: string;
  error?: string;
};

/**
 * Starts the Copilot runtime, reads its version and authentication status, and stops it.
 * No session is created and no model request is made.
 */
export async function checkCopilot(
  copilot: LoomConfig["copilot"],
  options: { workspaceRoot?: string; timeoutMs?: number } = {},
): Promise<CopilotCheck> {
  const resolved = resolveClientOptions(copilot, options);
  const result: CopilotCheck = { profile: resolved.profile, runtime: resolved.runtime, authenticated: false };
  const client = new CopilotClient(resolved.options);

  const work = async () => {
    await client.start();
    const status = await client.getStatus();
    result.runtimeVersion = status.version;
    const auth = await client.getAuthStatus();
    result.authenticated = auth.isAuthenticated;
    result.login = auth.login;
    result.authType = auth.authType;
  };

  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Copilot runtime did not respond within ${options.timeoutMs ?? 20_000} ms`)),
      options.timeoutMs ?? 20_000,
    );
  });

  try {
    await Promise.race([work(), timeout]);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timer);
    await client.stop().catch(() => client.forceStop());
  }
  return result;
}
