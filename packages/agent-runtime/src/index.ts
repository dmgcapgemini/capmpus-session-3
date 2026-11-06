// Copilot SDK client, hardened sessions, tool policy and event mapping.

export { type CopilotCheck, checkCopilot } from "./check.ts";
export { type ClientProfile, type ResolvedClient, resolveClientOptions } from "./client-options.ts";
export { CopilotAgentRunner, type CopilotRunnerOptions } from "./copilot-runner.ts";
export { createEventMapper } from "./event-mapper.ts";
export { ANALYSIS_INSTRUCTIONS, DEFAULT_ANALYSIS_TASK } from "./instructions.ts";
export {
  createRunGuards,
  type DenialEvent,
  evaluateToolPolicy,
  type PolicyDecision,
  type PolicyRule,
  type RunGuards,
  TOOL_CALL_BUDGET,
} from "./policy.ts";
export type { AgentRunner, RunHandle, RunInput, RunOutcome } from "./runner.ts";
export { compareVersions, readSdkInfo, type SdkInfo } from "./sdk-info.ts";
export { buildSessionConfig, type SessionConfigInput } from "./session-config.ts";
