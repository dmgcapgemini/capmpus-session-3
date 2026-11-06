import type {
  AgentRun,
  ClientProfile,
  RunDiagnostics,
  RunStatus,
  RunTotals,
  StoredAnalysisResult,
  SubmitAnalysisInput,
} from "@loom/contracts";
import { type Selectable, sql } from "kysely";
import type { LoomDatabase } from "./database.ts";
import type { AgentRunsTable } from "./schema.ts";
import { isSQLite } from "./sqlite.ts";

const iso = (value: Date | null) => (value === null ? null : value.toISOString());

function toAgentRun(row: Selectable<AgentRunsTable>): AgentRun {
  return {
    id: row.id,
    task: row.task,
    status: row.status,
    clientProfile: row.client_profile,
    model: row.model,
    sessionId: row.session_id,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
    error: row.error,
    diagnostics: row.diagnostics,
    modelCalls: row.model_calls,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    toolCalls: row.tool_calls,
    deniedToolCalls: row.denied_tool_calls,
  };
}

export async function createRun(
  db: LoomDatabase,
  run: { id: string; task: string; clientProfile: ClientProfile; model: string | null },
): Promise<AgentRun> {
  const row = await db
    .insertInto("agent_runs")
    .values({
      id: run.id,
      task: run.task,
      status: "running",
      client_profile: run.clientProfile,
      model: run.model,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return toAgentRun(row);
}

/** Records the outcome of a running run. Returns undefined when the run was not running. */
export async function finishRun(
  db: LoomDatabase,
  id: string,
  outcome: {
    status: Exclude<RunStatus, "running">;
    error: string | null;
    sessionId: string | null;
    totals: RunTotals;
    diagnostics?: RunDiagnostics;
  },
): Promise<AgentRun | undefined> {
  const row = await db
    .updateTable("agent_runs")
    .set({
      status: outcome.status,
      error: outcome.error,
      diagnostics: outcome.diagnostics ? JSON.stringify(outcome.diagnostics) : null,
      session_id: outcome.sessionId,
      finished_at: new Date(),
      model_calls: outcome.totals.modelCalls,
      input_tokens: outcome.totals.inputTokens,
      output_tokens: outcome.totals.outputTokens,
      tool_calls: outcome.totals.toolCalls,
      denied_tool_calls: outcome.totals.deniedToolCalls,
    })
    .where("id", "=", id)
    .where("status", "=", "running")
    .returningAll()
    .executeTakeFirst();
  return row && toAgentRun(row);
}

export async function getRun(db: LoomDatabase, id: string): Promise<AgentRun | undefined> {
  const row = await db.selectFrom("agent_runs").selectAll().where("id", "=", id).executeTakeFirst();
  return row && toAgentRun(row);
}

export async function listRuns(db: LoomDatabase, limit = 20): Promise<AgentRun[]> {
  const rows = await db
    .selectFrom("agent_runs")
    .selectAll()
    .orderBy("started_at", "desc")
    .$if(isSQLite(db), (qb) => qb.orderBy(sql<number>`rowid`, "desc"))
    .limit(limit)
    .execute();
  return rows.map(toAgentRun);
}

/** Marks runs left `running` by a previous process as failed. Returns how many were marked. */
export async function markInterruptedRuns(db: LoomDatabase): Promise<number> {
  const result = await db
    .updateTable("agent_runs")
    .set({ status: "failed", error: "interrupted: the API restarted", finished_at: new Date() })
    .where("status", "=", "running")
    .executeTakeFirst();
  return Number(result.numUpdatedRows);
}

export async function saveAnalysisResult(
  db: LoomDatabase,
  runId: string,
  result: SubmitAnalysisInput,
): Promise<{ id: number }> {
  const row = await db
    .insertInto("analysis_results")
    .values({ agent_run_id: runId, result: JSON.stringify(result) })
    .returning("id")
    .executeTakeFirstOrThrow();
  return { id: Number(row.id) };
}

export async function getAnalysisResult(
  db: LoomDatabase,
  runId: string,
): Promise<StoredAnalysisResult | null> {
  const row = await db
    .selectFrom("analysis_results")
    .selectAll()
    .where("agent_run_id", "=", runId)
    .executeTakeFirst();
  if (!row) return null;
  return {
    id: Number(row.id),
    agentRunId: row.agent_run_id,
    result: row.result,
    createdAt: row.created_at.toISOString(),
  };
}

/** Adapter for the agent tools' result store port. */
export const analysisResultStore = (db: LoomDatabase) => ({
  save: (runId: string, result: SubmitAnalysisInput) => saveAnalysisResult(db, runId, result),
});
