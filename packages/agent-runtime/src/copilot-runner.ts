import { mkdir } from "node:fs/promises";
import { CopilotClient, type CopilotSession } from "@github/copilot-sdk";
import type { ResolvedClient } from "./client-options.ts";
import { createEventMapper } from "./event-mapper.ts";
import { createRunGuards, TOOL_CALL_BUDGET } from "./policy.ts";
import type { AgentRunner, RunHandle, RunInput, RunOutcome } from "./runner.ts";
import { buildSessionConfig } from "./session-config.ts";

export type CopilotRunnerOptions = {
  /** Empty directory used as the session's working directory, so nothing ambient is found there. */
  workingDirectory: string;
  model?: string;
  timeoutMs?: number;
  toolCallBudget?: number;
};

/** Runs each Loom run in its own hardened Copilot session, on one shared client. */
export class CopilotAgentRunner implements AgentRunner {
  readonly profile;
  readonly runtime;
  readonly model;
  readonly #resolved: ResolvedClient;
  readonly #options: CopilotRunnerOptions;
  #client: Promise<CopilotClient> | undefined;

  constructor(resolved: ResolvedClient, options: CopilotRunnerOptions) {
    this.#resolved = resolved;
    this.#options = options;
    this.profile = resolved.profile;
    this.runtime = resolved.runtime;
    this.model = options.model ?? null;
  }

  #getClient(): Promise<CopilotClient> {
    this.#client ??= (async () => {
      await mkdir(this.#options.workingDirectory, { recursive: true });
      const client = new CopilotClient(this.#resolved.options);
      await client.start();
      return client;
    })().catch((error: unknown) => {
      this.#client = undefined;
      throw error;
    });
    return this.#client;
  }

  start(input: RunInput): RunHandle {
    let session: CopilotSession | undefined;
    let stopped = false;
    const timeoutMs = this.#options.timeoutMs ?? 180_000;
    const deadline = Date.now() + timeoutMs;

    const done = (async (): Promise<RunOutcome> => {
      const client = await this.#getClient();
      const toolNames = input.tools.map((tool) => tool.name);
      const toolCallBudget = this.#options.toolCallBudget ?? TOOL_CALL_BUDGET;
      const guards = createRunGuards({
        toolNames,
        hasReadSource: input.hasReadSource,
        onDenied: input.onEvent,
        budget: toolCallBudget,
      });
      const mapEvent = createEventMapper({ toolNames, instructions: input.instructions });

      session = await client.createSession(
        buildSessionConfig({
          tools: input.tools,
          instructions: input.instructions,
          guards,
          workingDirectory: this.#options.workingDirectory,
          ...(this.#options.model ? { model: this.#options.model } : {}),
        }),
      );
      const sessionId = session.sessionId;
      let runtimeError: string | undefined;
      const unsubscribe = session.on((event) => {
        if (event.type === "session.error") runtimeError = event.data.message;
        for (const payload of mapEvent(event)) input.onEvent(payload);
      });

      try {
        if (stopped) return { kind: "stopped", sessionId };
        let prompt = input.task;
        for (let attempt = 0; attempt <= 2; attempt++) {
          if (stopped) return { kind: "stopped", sessionId };
          const remaining = deadline - Date.now();
          if (remaining <= 0) throw new Error("Timeout after run deadline");
          await session.sendAndWait({ prompt }, remaining);
          if (stopped) return { kind: "stopped", sessionId };
          if (runtimeError) return { kind: "error", sessionId, error: runtimeError };
          if (!input.completion || input.completion.hasResult()) return { kind: "idle", sessionId };
          if (Date.now() >= deadline) throw new Error("Timeout after run deadline");
          if (guards.toolCalls() >= toolCallBudget)
            return {
              kind: "idle",
              sessionId,
              failureCode: "tool_budget",
              error: "Tool-call budget exhausted before a validated answer was stored",
            };
          if (attempt === 2)
            return {
              kind: "idle",
              sessionId,
              failureCode: "missing_submission",
              error: "No validated answer was stored after two completion recovery attempts",
            };
          input.onEvent({ type: "run.recovery", attempt: attempt + 1 });
          prompt = input.completion.prompt;
        }
        throw new Error("Completion loop exhausted unexpectedly");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (stopped) return { kind: "stopped", sessionId };
        if (message.startsWith("Timeout after")) {
          await session.abort().catch(() => {});
          return { kind: "timeout", sessionId, error: `No result within ${timeoutMs / 1000} seconds` };
        }
        return { kind: "error", sessionId, error: message };
      } finally {
        unsubscribe();
        await session.disconnect().catch(() => {});
      }
    })().catch((error: unknown) => ({
      kind: "error" as const,
      sessionId: session?.sessionId ?? null,
      error: error instanceof Error ? error.message : String(error),
    }));

    return {
      done,
      stop: async () => {
        stopped = true;
        await session?.abort().catch(() => {});
      },
    };
  }

  async close(): Promise<void> {
    const client = this.#client;
    this.#client = undefined;
    if (!client) return;
    const started = await client.catch(() => undefined);
    await started?.stop().catch(() => started.forceStop());
  }
}
