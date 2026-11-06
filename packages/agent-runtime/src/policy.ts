import type { PermissionRequest, PermissionRequestResult, SessionHooks } from "@github/copilot-sdk";
import type { RunEventPayload } from "@loom/contracts";

type PreToolUseHookOutput = Exclude<Awaited<ReturnType<NonNullable<SessionHooks["onPreToolUse"]>>>, void>;

export const TOOL_CALL_BUDGET = 12;

export type PolicyRule = "registered-tools-only" | "read-before-submit" | "tool-call-budget";

export type PolicyState = {
  toolNames: ReadonlySet<string>;
  toolCalls: number;
  hasReadSource: boolean;
};

export type PolicyDecision = { allow: true } | { allow: false; rule: PolicyRule; reason: string };

/** Tools that may only run after at least one source was read in the run. */
const REQUIRES_PRIOR_READ = new Set(["submit_analysis_result"]);

/** Loom's decision for one tool call. Pure: the caller keeps the state. */
export function evaluateToolPolicy(
  state: PolicyState,
  toolName: string,
  budget = TOOL_CALL_BUDGET,
): PolicyDecision {
  if (!state.toolNames.has(toolName)) {
    return {
      allow: false,
      rule: "registered-tools-only",
      reason: `Tool ${toolName} is not available in Loom.`,
    };
  }
  if (state.toolCalls >= budget) {
    return {
      allow: false,
      rule: "tool-call-budget",
      reason: `Tool-call budget of ${budget} reached; stop this run.`,
    };
  }
  if (REQUIRES_PRIOR_READ.has(toolName) && !state.hasReadSource) {
    return {
      allow: false,
      rule: "read-before-submit",
      reason: "Read at least one source before submitting an analysis.",
    };
  }
  return { allow: true };
}

export type DenialEvent = Extract<RunEventPayload, { type: "tool.denied" }>;

export type RunGuards = {
  onPreToolUse: (input: { toolName: string }) => PreToolUseHookOutput;
  onPermissionRequest: (request: PermissionRequest) => PermissionRequestResult;
  toolCalls: () => number;
};

/**
 * The session's pre-tool hook and permission handler for one run. Copilot enforces what these return;
 * Loom decides, and every denial is reported through onDenied.
 */
export function createRunGuards(options: {
  toolNames: readonly string[];
  hasReadSource: () => boolean;
  onDenied: (denial: DenialEvent) => void;
  budget?: number;
}): RunGuards {
  const toolNames = new Set(options.toolNames);
  let toolCalls = 0;

  return {
    onPreToolUse: ({ toolName }) => {
      const decision = evaluateToolPolicy(
        { toolNames, toolCalls, hasReadSource: options.hasReadSource() },
        toolName,
        options.budget,
      );
      if (!decision.allow) {
        options.onDenied({
          type: "tool.denied",
          toolName,
          stage: "policy",
          rule: decision.rule,
          reason: decision.reason,
        });
        return { permissionDecision: "deny", permissionDecisionReason: decision.reason };
      }
      toolCalls += 1;
      return { permissionDecision: "allow" };
    },

    onPermissionRequest: (request) => {
      const toolName =
        "toolName" in request && typeof request.toolName === "string" ? request.toolName : undefined;
      if (request.kind === "custom-tool" && toolName && toolNames.has(toolName))
        return { kind: "approve-once" };
      const reason = "Only Loom's tools are available; this request is not permitted.";
      options.onDenied({
        type: "tool.denied",
        toolName: toolName ?? request.kind,
        stage: "permission",
        rule: "loom-tools-only",
        reason,
      });
      return { kind: "reject", feedback: reason };
    },

    toolCalls: () => toolCalls,
  };
}
