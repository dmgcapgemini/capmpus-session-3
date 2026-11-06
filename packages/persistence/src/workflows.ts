import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { SubmitAnalysisInput, Workflow, WorkflowDetail, WorkflowState } from "@loom/contracts";
import type { Selectable, Transaction } from "kysely";
import type { LoomDatabase } from "./database.ts";
import { getAnalysisResult, getRun, saveAnalysisResult } from "./runs.ts";
import type { Database, WorkflowsTable } from "./schema.ts";
import { isSQLite } from "./sqlite.ts";

type Row = Selectable<WorkflowsTable>;
type Tx = Transaction<Database>;
export class WorkflowError extends Error {
  readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
const toWorkflow = (row: Row): Workflow => ({
  id: row.id,
  task: row.task,
  state: row.state,
  version: row.version,
  attempt: row.attempt,
  maxAttempts: row.max_attempts,
  runId: row.run_id,
  resultId: row.result_id === null ? null : Number(row.result_id),
  error: row.error,
  createdAt: row.created_at.toISOString(),
  updatedAt: row.updated_at.toISOString(),
});
const transitions: Record<WorkflowState, readonly WorkflowState[]> = {
  CREATED: ["ANALYSING"],
  ANALYSING: ["ANALYSING", "PROPOSAL_READY", "FAILED"],
  PROPOSAL_READY: ["AWAITING_REVIEW"],
  AWAITING_REVIEW: ["ACCEPTED", "REJECTED"],
  ACCEPTED: [],
  REJECTED: [],
  FAILED: [],
};

export function assertWorkflowTransition(from: WorkflowState, to: WorkflowState) {
  if (!transitions[from].includes(to)) throw new WorkflowError(409, `Cannot transition ${from} to ${to}`);
}
async function locked(tx: Tx, db: LoomDatabase, id: string, version?: number): Promise<Row> {
  const row = await tx
    .selectFrom("workflows")
    .selectAll()
    .where("id", "=", id)
    .$if(!isSQLite(db), (query) => query.forUpdate())
    .executeTakeFirst();
  if (!row) throw new WorkflowError(404, "Workflow not found");
  if (version !== undefined && row.version !== version)
    throw new WorkflowError(409, "Workflow changed; refresh before trying again");
  return row;
}
async function advance(
  tx: Tx,
  row: Row,
  to: WorkflowState,
  reason: string,
  patch: { run_id?: string; attempt?: number; result_id?: string; error?: string | null } = {},
): Promise<Workflow> {
  assertWorkflowTransition(row.state, to);
  const updated = await tx
    .updateTable("workflows")
    .set({ ...patch, state: to, version: row.version + 1, updated_at: new Date() })
    .where("id", "=", row.id)
    .where("version", "=", row.version)
    .returningAll()
    .executeTakeFirst();
  if (!updated) throw new WorkflowError(409, "Workflow changed; refresh before trying again");
  await tx
    .insertInto("workflow_events")
    .values({
      workflow_id: row.id,
      version: updated.version,
      from_state: row.state,
      to_state: to,
      reason,
      run_id: updated.run_id,
    })
    .execute();
  return toWorkflow(updated);
}
export async function createWorkflow(db: LoomDatabase, task: string, maxAttempts = 3): Promise<Workflow> {
  return db.transaction().execute(async (tx) => {
    const row = await tx
      .insertInto("workflows")
      .values({
        id: randomUUID(),
        task,
        max_attempts: maxAttempts,
        state: "CREATED",
        submission_key: randomUUID(),
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    await tx
      .insertInto("workflow_events")
      .values({
        workflow_id: row.id,
        version: 0,
        from_state: null,
        to_state: "CREATED",
        reason: "Created by human",
        run_id: null,
      })
      .execute();
    return toWorkflow(row);
  });
}
export async function listWorkflows(db: LoomDatabase): Promise<Workflow[]> {
  return (
    await db.selectFrom("workflows").selectAll().orderBy("created_at", "desc").limit(100).execute()
  ).map(toWorkflow);
}
export async function pendingWorkflows(db: LoomDatabase): Promise<Workflow[]> {
  return (
    await db
      .selectFrom("workflows")
      .selectAll()
      .where("state", "in", ["CREATED", "ANALYSING", "PROPOSAL_READY"])
      .orderBy("created_at", "asc")
      .execute()
  ).map(toWorkflow);
}
export async function getWorkflow(db: LoomDatabase, id: string): Promise<Workflow> {
  const row = await db.selectFrom("workflows").selectAll().where("id", "=", id).executeTakeFirst();
  if (!row) throw new WorkflowError(404, "Workflow not found");
  return toWorkflow(row);
}
export async function workflowDetail(db: LoomDatabase, id: string): Promise<WorkflowDetail> {
  // One transaction reads a consistent snapshot; PostgreSQL also takes a shared row lock.
  return db.transaction().execute(async (tx) => {
    const row = await tx
      .selectFrom("workflows")
      .selectAll()
      .where("id", "=", id)
      .$if(!isSQLite(db), (query) => query.forShare())
      .executeTakeFirst();
    if (!row) throw new WorkflowError(404, "Workflow not found");
    const events = await tx
      .selectFrom("workflow_events")
      .selectAll()
      .where("workflow_id", "=", id)
      .orderBy("version")
      .execute();
    return {
      workflow: toWorkflow(row),
      events: events.map((e) => ({
        version: e.version,
        from: e.from_state,
        to: e.to_state,
        reason: e.reason,
        runId: e.run_id,
        at: e.created_at.toISOString(),
      })),
      result: row.result_id !== null && row.run_id ? await getAnalysisResult(tx, row.run_id) : null,
    };
  });
}
export async function claimWorkflowAttempt(db: LoomDatabase, id: string, version: number, runId: string) {
  return db.transaction().execute(async (tx) => {
    const row = await locked(tx, db, id, version);
    if (!["CREATED", "ANALYSING"].includes(row.state) || row.attempt >= row.max_attempts)
      throw new WorkflowError(409, "No analysis attempt available");
    const prior = row.run_id ? await getRun(tx, row.run_id) : undefined;
    return advance(
      tx,
      row,
      "ANALYSING",
      row.attempt
        ? `Retrying invocation: ${prior?.error ?? prior?.status ?? "interrupted"}`
        : "Starting analysis",
      {
        run_id: runId,
        attempt: row.attempt + 1,
        error: null,
      },
    );
  });
}
export async function finishWorkflow(db: LoomDatabase, id: string, version: number, error: string) {
  return db
    .transaction()
    .execute(async (tx) => advance(tx, await locked(tx, db, id, version), "FAILED", error, { error }));
}
export async function requestWorkflowReview(db: LoomDatabase, id: string, version: number) {
  return db
    .transaction()
    .execute(async (tx) =>
      advance(
        tx,
        await locked(tx, db, id, version),
        "AWAITING_REVIEW",
        "Validated proposal requires a human decision",
      ),
    );
}
export async function reviewWorkflow(
  db: LoomDatabase,
  id: string,
  version: number,
  decision: "ACCEPTED" | "REJECTED",
  reason: string,
) {
  return db
    .transaction()
    .execute(async (tx) =>
      advance(tx, await locked(tx, db, id, version), decision, `Human decision: ${reason}`),
    );
}

export async function workflowResultStore(db: LoomDatabase, workflowId: string) {
  const binding = await db
    .selectFrom("workflows")
    .select("submission_key")
    .where("id", "=", workflowId)
    .executeTakeFirstOrThrow();
  return {
    idempotent: true,
    save: async (runId: string, result: SubmitAnalysisInput): Promise<{ id: number }> =>
      db.transaction().execute(async (tx) => {
        const row = await locked(tx, db, workflowId);
        if (row.submission_key !== binding.submission_key || row.run_id !== runId)
          throw new WorkflowError(409, "Submission belongs to a stale attempt");
        if (row.result_id !== null) {
          const stored = await getAnalysisResult(tx, runId);
          if (!stored || !isDeepStrictEqual(stored.result, result))
            throw new WorkflowError(409, "Submission key already used with a different analysis");
          return { id: Number(row.result_id) };
        }
        if (row.state !== "ANALYSING") throw new WorkflowError(409, "Workflow is not analysing");
        const saved = await saveAnalysisResult(tx, runId, result);
        await advance(tx, row, "PROPOSAL_READY", "Validated analysis stored; not yet human accepted", {
          result_id: String(saved.id),
        });
        return saved;
      }),
  };
}
