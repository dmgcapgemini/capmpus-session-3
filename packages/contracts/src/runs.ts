import { z } from "zod";
import { StoredAnalysisResult } from "./analysis.ts";

export const RunStatus = z.enum(["running", "completed", "incomplete", "failed", "stopped"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const ClientProfile = z.enum(["workshop", "production"]);
export type ClientProfile = z.infer<typeof ClientProfile>;

export const RunTotals = z.object({
  modelCalls: z.number().int(),
  inputTokens: z.number().int(),
  outputTokens: z.number().int(),
  toolCalls: z.number().int(),
  deniedToolCalls: z.number().int(),
});
export type RunTotals = z.infer<typeof RunTotals>;

export const RunDiagnostics = z.object({
  termination: z.enum([
    "completed",
    "missing_submission",
    "submission_rejected",
    "submission_denied",
    "storage_error",
    "tool_error",
    "tool_budget",
    "runtime_error",
    "timeout",
    "stopped",
  ]),
  recoveries: z.number().int().nonnegative(),
  submissionAttempts: z.number().int().nonnegative(),
  assistantMessages: z.array(z.object({ id: z.string(), content: z.string(), partial: z.boolean() })),
  events: z.array(z.object({ id: z.string(), at: z.string(), kind: z.string(), message: z.string() })),
  truncated: z.boolean(),
});
export type RunDiagnostics = z.infer<typeof RunDiagnostics>;

export const AgentRun = RunTotals.extend({
  id: z.string(),
  task: z.string(),
  status: RunStatus,
  clientProfile: ClientProfile,
  model: z.string().nullable(),
  sessionId: z.string().nullable(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  diagnostics: RunDiagnostics.nullable().optional(),
});
export type AgentRun = z.infer<typeof AgentRun>;

export const StartRunRequest = z.object({ task: z.string().trim().min(1).max(2000).optional() });
export type StartRunRequest = z.infer<typeof StartRunRequest>;

export const StartRunResponse = z.object({ runId: z.string() });
export type StartRunResponse = z.infer<typeof StartRunResponse>;

export const RunDetail = z.object({ run: AgentRun, result: StoredAnalysisResult.nullable() });
export type RunDetail = z.infer<typeof RunDetail>;

export const RunList = z.object({ runs: z.array(AgentRun) });
export type RunList = z.infer<typeof RunList>;

export const AgentProfile = z.object({
  toolNames: z.array(z.string()),
  toolCallBudget: z.number().int(),
  clientProfile: ClientProfile,
  runtime: z.string(),
  model: z.string().nullable(),
  defaultTask: z.string(),
});
export type AgentProfile = z.infer<typeof AgentProfile>;

export const ApiError = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiError>;
