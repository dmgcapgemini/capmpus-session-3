import type {
  KnowledgeAnswer,
  KnowledgeItem,
  RetrievalReport,
  RunDiagnostics,
  SubmitAnalysisInput,
  WorkflowState,
} from "@loom/contracts";
import type { ColumnType, Generated } from "kysely";

// Hand-written database types (ADR 0005). Keep in step with src/migrations;
// persistence.int.test.ts compares these tables and columns with information_schema.

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface LoomMetaTable {
  key: string;
  value: string;
  updated_at: Timestamp;
}

export interface AgentRunsTable {
  id: string;
  task: string;
  status: "running" | "completed" | "incomplete" | "failed" | "stopped";
  client_profile: "workshop" | "production";
  model: string | null;
  session_id: string | null;
  started_at: Timestamp;
  finished_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;
  error: string | null;
  diagnostics: ColumnType<RunDiagnostics | null, string | null | undefined, string | null>;
  model_calls: Generated<number>;
  input_tokens: Generated<number>;
  output_tokens: Generated<number>;
  tool_calls: Generated<number>;
  denied_tool_calls: Generated<number>;
}

export interface AnalysisResultsTable {
  id: ColumnType<string, never, never>;
  agent_run_id: string;
  /** jsonb: written as a JSON string, read as a parsed object. */
  result: ColumnType<SubmitAnalysisInput, string, string>;
  created_at: Timestamp;
}

export interface WorkflowsTable {
  id: string;
  task: string;
  state: WorkflowState;
  version: Generated<number>;
  attempt: Generated<number>;
  max_attempts: number;
  run_id: string | null;
  result_id: ColumnType<string | null, string | null | undefined, string | null>;
  submission_key: string;
  error: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export interface WorkflowEventsTable {
  workflow_id: string;
  version: number;
  from_state: WorkflowState | null;
  to_state: WorkflowState;
  reason: string;
  run_id: string | null;
  created_at: Timestamp;
}

type Json<T> = ColumnType<T, string, string>;
export interface Database {
  knowledge_documents: {
    id: string;
    content: string;
    authority: KnowledgeItem["authority"];
    observed_at: Timestamp;
    facts: Json<KnowledgeItem["facts"]>;
    search: Generated<string>;
  };
  knowledge_drivers: { id: string; name: string };
  knowledge_licences: { driver_id: string; category: string; observed_at: Timestamp };
  knowledge_customers: { id: string; name: string };
  knowledge_locations: { id: string; customer_id: string; window_minutes: number; observed_at: Timestamp };
  knowledge_vehicles: { id: string; required_licence: string; payload_kg: number; observed_at: Timestamp };
  knowledge_queries: {
    run_id: string;
    reports: ColumnType<RetrievalReport[], string | undefined, string>;
    answer: ColumnType<KnowledgeAnswer | null, string | null | undefined, string | null>;
  };
  workflows: WorkflowsTable;
  workflow_events: WorkflowEventsTable;
  loom_meta: LoomMetaTable;
  agent_runs: AgentRunsTable;
  analysis_results: AnalysisResultsTable;
}

/** Tables and columns declared above, in column order, used by the schema consistency test. */
export const declaredColumns: Record<keyof Database, string[]> = {
  knowledge_documents: ["id", "content", "authority", "observed_at", "facts", "search"],
  knowledge_drivers: ["id", "name"],
  knowledge_licences: ["driver_id", "category", "observed_at"],
  knowledge_customers: ["id", "name"],
  knowledge_locations: ["id", "customer_id", "window_minutes", "observed_at"],
  knowledge_vehicles: ["id", "required_licence", "payload_kg", "observed_at"],
  knowledge_queries: ["run_id", "reports", "answer"],
  workflows: [
    "id",
    "task",
    "state",
    "version",
    "attempt",
    "max_attempts",
    "run_id",
    "result_id",
    "submission_key",
    "error",
    "created_at",
    "updated_at",
  ],
  workflow_events: ["workflow_id", "version", "from_state", "to_state", "reason", "run_id", "created_at"],
  agent_runs: [
    "id",
    "task",
    "status",
    "client_profile",
    "model",
    "session_id",
    "started_at",
    "finished_at",
    "error",
    "model_calls",
    "input_tokens",
    "output_tokens",
    "tool_calls",
    "denied_tool_calls",
    "diagnostics",
  ],
  analysis_results: ["id", "agent_run_id", "result", "created_at"],
  loom_meta: ["key", "value", "updated_at"],
};
