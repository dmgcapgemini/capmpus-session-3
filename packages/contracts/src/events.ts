import { z } from "zod";
import { ClientProfile, RunStatus, RunTotals } from "./runs.ts";

// Loom trace events: what Loom records and streams about a run, independent of the SDK's event model.

const payloads = [
  z.object({ type: z.literal("run.recovery"), attempt: z.number().int().positive() }),
  z.object({
    type: z.literal("run.submission"),
    toolCallId: z.string(),
    outcome: z.enum(["started", "stored", "rejected", "storage_error", "tool_error"]),
    message: z.string(),
  }),
  z.object({
    type: z.literal("run.started"),
    task: z.string(),
    clientProfile: ClientProfile,
    model: z.string().nullable(),
  }),
  z.object({
    type: z.literal("context.supplied"),
    toolNames: z.array(z.string()),
    instructions: z.string(),
    systemPromptChars: z.number().int(),
  }),
  z.object({ type: z.literal("assistant.delta"), messageId: z.string(), text: z.string() }),
  z.object({ type: z.literal("assistant.message"), messageId: z.string(), content: z.string() }),
  z.object({
    type: z.literal("tool.requested"),
    toolCallId: z.string(),
    toolName: z.string(),
    arguments: z.unknown(),
  }),
  z.object({
    type: z.literal("tool.completed"),
    toolCallId: z.string(),
    toolName: z.string(),
    success: z.boolean(),
    summary: z.string(),
  }),
  z.object({
    type: z.literal("tool.denied"),
    toolName: z.string(),
    stage: z.enum(["policy", "permission"]),
    rule: z.string(),
    reason: z.string(),
  }),
  z.object({
    type: z.literal("usage"),
    model: z.string(),
    inputTokens: z.number().int(),
    outputTokens: z.number().int(),
    durationMs: z.number().nullable(),
  }),
  z.object({
    type: z.literal("run.finished"),
    status: RunStatus,
    analysisResultId: z.number().int().nullable(),
    error: z.string().nullable(),
    totals: RunTotals,
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
  z.object({ type: z.literal("raw"), sdkType: z.string(), data: z.unknown() }),
] as const;

export const RunEventPayload = z.discriminatedUnion("type", payloads);
export type RunEventPayload = z.infer<typeof RunEventPayload>;

const envelope = z.object({ seq: z.number().int().positive(), at: z.string(), runId: z.string() });

export const RunEvent = z.discriminatedUnion(
  "type",
  payloads.map((payload) => payload.extend(envelope.shape)) as unknown as typeof payloads,
);
export type RunEvent = RunEventPayload & z.infer<typeof envelope>;

export type RunEventOf<T extends RunEvent["type"]> = Extract<RunEvent, { type: T }>;
