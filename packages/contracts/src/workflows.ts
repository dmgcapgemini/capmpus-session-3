import { z } from "zod";
import { StoredAnalysisResult } from "./analysis.ts";

export const WorkflowState = z.enum([
  "CREATED",
  "ANALYSING",
  "PROPOSAL_READY",
  "AWAITING_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "FAILED",
]);
export type WorkflowState = z.infer<typeof WorkflowState>;
export const Workflow = z.object({
  id: z.uuid(),
  task: z.string(),
  state: WorkflowState,
  version: z.number().int().nonnegative(),
  attempt: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive(),
  runId: z.uuid().nullable(),
  resultId: z.number().int().positive().nullable(),
  error: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Workflow = z.infer<typeof Workflow>;
export const WorkflowEvent = z.object({
  version: z.number().int().nonnegative(),
  from: WorkflowState.nullable(),
  to: WorkflowState,
  reason: z.string(),
  runId: z.uuid().nullable(),
  at: z.iso.datetime(),
});
export const WorkflowDetail = z.object({
  workflow: Workflow,
  events: z.array(WorkflowEvent),
  result: StoredAnalysisResult.nullable(),
});
export type WorkflowDetail = z.infer<typeof WorkflowDetail>;
export const WorkflowList = z.object({ workflows: z.array(Workflow) });
export const CreateWorkflowRequest = z.object({
  task: z.string().trim().min(1).max(2000),
  maxAttempts: z.number().int().min(1).max(5).default(3),
});
export const ReviewWorkflowRequest = z.object({
  version: z.number().int().nonnegative(),
  reason: z.string().trim().min(1).max(1000),
});
