import type { SessionEvent, ToolInvocation } from "@github/copilot-sdk";
import { createEventMapper } from "./event-mapper.ts";
import { createRunGuards, TOOL_CALL_BUDGET } from "./policy.ts";
import type { AgentRunner, RunHandle, RunInput, RunOutcome } from "./runner.ts";

export type ScriptStep =
  | { tool: string; args: unknown }
  | { say: string }
  | { permission: string }
  | { fail: string }
  | { waitForStop: true };

/** Builds an SDK-shaped event, as the Copilot runtime would emit it. */
export function sdkEvent(type: string, data: unknown): SessionEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    parentId: null,
    type,
    data,
  } as unknown as SessionEvent;
}

const resultText = (result: unknown) => (typeof result === "string" ? result : JSON.stringify(result));
const isFailureResult = (result: unknown): result is { textResultForLlm: string } =>
  typeof result === "object" &&
  result !== null &&
  (result as { resultType?: string }).resultType === "failure";

/**
 * A deterministic stand-in for the Copilot runtime: plays a script of tool calls through the same
 * guards, tool handlers and event mapper as a real run. Used by unit and integration tests.
 */
export class ScriptedAgentRunner implements AgentRunner {
  readonly profile = "workshop" as const;
  readonly runtime = "scripted";
  readonly model = "scripted-model";
  readonly #script: ScriptStep[];
  readonly #budget: number;

  constructor(script: ScriptStep[], options: { toolCallBudget?: number } = {}) {
    this.#script = script;
    this.#budget = options.toolCallBudget ?? TOOL_CALL_BUDGET;
  }

  start(input: RunInput): RunHandle {
    let stopped = false;
    let release: () => void = () => {};
    const stopSignal = new Promise<void>((resolve) => {
      release = resolve;
    });
    const sessionId = `scripted-${input.runId}`;

    const done = (async (): Promise<RunOutcome> => {
      const toolNames = input.tools.map((tool) => tool.name);
      const guards = createRunGuards({
        toolNames,
        hasReadSource: input.hasReadSource,
        onDenied: input.onEvent,
        budget: this.#budget,
      });
      const mapEvent = createEventMapper({ toolNames, instructions: input.instructions });
      const emit = (type: string, data: unknown) => {
        for (const payload of mapEvent(sdkEvent(type, data))) input.onEvent(payload);
      };

      emit("system.message", { role: "system", content: `Runtime prompt.\n${input.instructions}` });
      emit("user.message", { content: input.task });

      for (const [index, step] of this.#script.entries()) {
        await Promise.resolve();
        if (stopped) return { kind: "stopped", sessionId };

        if ("fail" in step) return { kind: "error", sessionId, error: step.fail };
        if ("waitForStop" in step) {
          await stopSignal;
          return { kind: "stopped", sessionId };
        }
        if ("say" in step) {
          emit("assistant.message", { messageId: `m-${index}`, content: step.say });
          continue;
        }
        if ("permission" in step) {
          guards.onPermissionRequest({ kind: step.permission, toolCallId: `perm-${index}` } as never);
          continue;
        }

        emit("assistant.usage", { model: this.model, inputTokens: 1_000, outputTokens: 50, duration: 10 });
        if (guards.onPreToolUse({ toolName: step.tool }).permissionDecision === "deny") continue;

        const toolCallId = `call-${index}`;
        emit("tool.execution_start", { toolCallId, toolName: step.tool, arguments: step.args });
        const tool = input.tools.find((candidate) => candidate.name === step.tool);
        const invocation: ToolInvocation = {
          sessionId,
          toolCallId,
          toolName: step.tool,
          arguments: step.args,
        };
        const result = tool?.handler ? await tool.handler(step.args, invocation) : undefined;
        if (isFailureResult(result)) {
          emit("tool.execution_complete", {
            toolCallId,
            success: false,
            error: { message: result.textResultForLlm, code: "failure" },
          });
        } else {
          emit("tool.execution_complete", {
            toolCallId,
            success: true,
            result: { content: resultText(result) },
          });
        }
      }

      emit("session.idle", {});
      return { kind: stopped ? "stopped" : "idle", sessionId };
    })();

    return {
      done,
      stop: async () => {
        stopped = true;
        release();
      },
    };
  }

  async close(): Promise<void> {}
}
