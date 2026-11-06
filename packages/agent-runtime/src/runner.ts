import type { Tool } from "@github/copilot-sdk";
import type { ClientProfile, RunEventPayload } from "@loom/contracts";

export type RunInput = {
  runId: string;
  task: string;
  tools: Tool[];
  instructions: string;
  /** Whether the run has read a source yet; used by the read-before-submit rule. */
  hasReadSource: () => boolean;
  /** A run is complete only after its validated result has been persisted. */
  completion?: { hasResult: () => boolean; prompt: string };
  onEvent: (payload: RunEventPayload) => void;
};

export type RunOutcome = {
  kind: "idle" | "stopped" | "error" | "timeout";
  sessionId: string | null;
  error?: string;
  failureCode?: "missing_submission" | "tool_budget";
};

export type RunHandle = {
  done: Promise<RunOutcome>;
  stop: () => Promise<void>;
};

/** The inner loop, owned by an agent runtime. Loom starts it and observes it; it never stores state. */
export interface AgentRunner {
  readonly profile: ClientProfile;
  readonly runtime: string;
  readonly model: string | null;
  start(input: RunInput): RunHandle;
  close(): Promise<void>;
}
