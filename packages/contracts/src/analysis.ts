import { z } from "zod";

const items = (description: string) => z.array(z.string().min(1).max(300)).max(30).describe(description);

export const Evidence = z.object({
  sourceId: z.string().min(1).max(64).describe("ID of the source the quotation is copied from"),
  quotation: z.string().min(10).max(500).describe("Text copied exactly from that source"),
});
export type Evidence = z.infer<typeof Evidence>;

export const SubmitAnalysisInput = z.object({
  actors: items("People, roles or organisations that interact with the solution"),
  capabilities: items("What the solution must enable"),
  externalSystems: items("Existing systems the solution depends on or integrates with"),
  constraints: items("Rules, limits or conditions the solution must respect"),
  openQuestions: items("Information the sources leave unanswered"),
  evidence: z.array(Evidence).min(1).max(20).describe("Quotations that support the analysis"),
});
export type SubmitAnalysisInput = z.infer<typeof SubmitAnalysisInput>;

export const SubmitAnalysisResult = z.object({
  accepted: z.literal(true),
  analysisResultId: z.number().int(),
});
export type SubmitAnalysisResult = z.infer<typeof SubmitAnalysisResult>;

export const StoredAnalysisResult = z.object({
  id: z.number().int(),
  agentRunId: z.string(),
  result: SubmitAnalysisInput,
  createdAt: z.string(),
});
export type StoredAnalysisResult = z.infer<typeof StoredAnalysisResult>;
