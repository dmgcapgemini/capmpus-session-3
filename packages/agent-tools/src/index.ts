import type { Tool } from "@github/copilot-sdk";
import type { ToolContext } from "./tools/context.ts";
import { listSourcesTool } from "./tools/list-sources.ts";
import { readSourceTool } from "./tools/read-source.ts";
import { submitAnalysisTool } from "./tools/submit-analysis.ts";

// Loom tools exposed to the agent. Each tool has one bounded responsibility, a typed input,
// deterministic validation and controlled errors.

export const SESSION_01_TOOL_NAMES = ["list_sources", "read_source", "submit_analysis_result"] as const;

/** The tools of one Session 1 analysis run, bound to that run's context. */
export function createAnalysisTools(ctx: ToolContext): Tool[] {
  return [listSourcesTool(ctx), readSourceTool(ctx), submitAnalysisTool(ctx)] as Tool[];
}

export { detectKnowledgeConflicts, MAX_AGE_MS, rejectionReason } from "./knowledge/policy.ts";
export {
  createKnowledgeTools,
  KNOWLEDGE_INSTRUCTIONS,
  type KnowledgeAdapter,
  KnowledgeRegistry,
} from "./knowledge/tools.ts";
export {
  loadSourceRegistry,
  MAX_SOURCE_BYTES,
  type SourceContent,
  SourceManifestError,
  type SourceRegistry,
} from "./sources/registry.ts";
export type { AnalysisResultStore, RunToolState, ToolContext } from "./tools/context.ts";
export { createRunToolState } from "./tools/context.ts";
export { failure, isFailure } from "./tools/results.ts";
