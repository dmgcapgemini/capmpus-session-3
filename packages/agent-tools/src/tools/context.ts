import type { SubmitAnalysisInput } from "@loom/contracts";
import type { SourceRegistry } from "../sources/registry.ts";

/** Per-run state the tools share. Lives in memory for the duration of one run. */
export type RunToolState = {
  readonly readSourceIds: Set<string>;
  acceptedResultId: number | null;
};

export interface AnalysisResultStore {
  readonly idempotent?: boolean;
  save(runId: string, result: SubmitAnalysisInput): Promise<{ id: number }>;
}

export type ToolContext = {
  runId: string;
  registry: SourceRegistry;
  results: AnalysisResultStore;
  state: RunToolState;
  log: (message: string, error: unknown) => void;
};

export const createRunToolState = (): RunToolState => ({ readSourceIds: new Set(), acceptedResultId: null });
