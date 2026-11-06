import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createRun } from "./runs.ts";
import { isSQLite } from "./sqlite.ts";
import { openTestDatabase, truncateAll } from "./testing.ts";
import {
  claimWorkflowAttempt,
  createWorkflow,
  getWorkflow,
  requestWorkflowReview,
  reviewWorkflow,
  workflowDetail,
  workflowResultStore,
} from "./workflows.ts";

const db = openTestDatabase();
afterAll(() => db.destroy());
beforeEach(() => truncateAll(db));
const analysis = {
  actors: ["Dispatcher"],
  capabilities: [],
  externalSystems: [],
  constraints: [],
  openQuestions: [],
  evidence: [{ sourceId: "solution-brief", quotation: "route changes are made by phone" }],
};
async function analysing() {
  const workflow = await createWorkflow(db, "Analyse FruitTrucks", 3);
  const run = await createRun(db, {
    id: randomUUID(),
    task: workflow.task,
    clientProfile: "workshop",
    model: null,
  });
  return claimWorkflowAttempt(db, workflow.id, 0, run.id);
}
async function ready() {
  const workflow = await analysing();
  await (await workflowResultStore(db, workflow.id)).save(workflow.runId as string, analysis);
  return requestWorkflowReview(db, workflow.id, 2);
}
describe("durable workflow repository", () => {
  it("persists a creation event and bounded attempt", async () => {
    const w = await analysing();
    expect(w).toMatchObject({ state: "ANALYSING", version: 1, attempt: 1 });
    expect((await workflowDetail(db, w.id)).events.map((e) => e.to)).toEqual(["CREATED", "ANALYSING"]);
  });
  it("workshop session-02: rejects invalid workflow transitions without an audit event", async () => {
    const w = await createWorkflow(db, "Analyse");
    await expect(reviewWorkflow(db, w.id, 0, "ACCEPTED", "Bypass")).rejects.toThrow(/Cannot transition/);
    expect((await workflowDetail(db, w.id)).events).toHaveLength(1);
  });
  it("rejects stale versions before mutation", async () => {
    const w = await analysing();
    await expect(claimWorkflowAttempt(db, w.id, 0, w.runId as string)).rejects.toThrow(/changed/);
    expect((await getWorkflow(db, w.id)).attempt).toBe(1);
  });
  it("rolls back a state update if the audit insert fails", async () => {
    const w = await analysing();
    if (isSQLite(db))
      await sql`create trigger test_audit_failure before insert on workflow_events
        when NEW.version >= 2 begin select raise(abort, 'test_audit_failure'); end`.execute(db);
    else
      await sql`alter table workflow_events add constraint test_audit_failure check (version < 2)`.execute(
        db,
      );
    try {
      await expect(claimWorkflowAttempt(db, w.id, 1, w.runId as string)).rejects.toThrow(
        /test_audit_failure/,
      );
      expect(await getWorkflow(db, w.id)).toEqual(w);
    } finally {
      if (isSQLite(db)) await sql`drop trigger test_audit_failure`.execute(db);
      else await sql`alter table workflow_events drop constraint test_audit_failure`.execute(db);
    }
  });
  it("workshop session-02: applies concurrent identical submissions once", async () => {
    const w = await analysing();
    const store = await workflowResultStore(db, w.id);
    const results = await Promise.all([
      store.save(w.runId as string, analysis),
      store.save(w.runId as string, analysis),
    ]);
    expect(results[0]).toEqual(results[1]);
    const detail = await workflowDetail(db, w.id);
    expect(detail.workflow.state).toBe("PROPOSAL_READY");
    expect(detail.events.filter((e) => e.to === "PROPOSAL_READY")).toHaveLength(1);
    expect(await db.selectFrom("analysis_results").selectAll().execute()).toHaveLength(1);
  });
  it("rejects changed replay and stale attempts", async () => {
    const w = await analysing();
    const store = await workflowResultStore(db, w.id);
    await store.save(w.runId as string, analysis);
    await expect(store.save(w.runId as string, { ...analysis, actors: ["Other"] })).rejects.toThrow();
    await expect(store.save(randomUUID(), analysis)).rejects.toThrow(/stale/);
  });
  it("allows exactly one competing human decision", async () => {
    const w = await ready();
    const results = await Promise.allSettled([
      reviewWorkflow(db, w.id, w.version, "ACCEPTED", "Evidence checked"),
      reviewWorkflow(db, w.id, w.version, "REJECTED", "Missing evidence"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect((await workflowDetail(db, w.id)).events).toHaveLength(5);
  });
  it("workshop session-02: terminal decisions cannot be reversed", async () => {
    const w = await ready();
    const accepted = await reviewWorkflow(db, w.id, w.version, "ACCEPTED", "Checked");
    await expect(reviewWorkflow(db, w.id, accepted.version, "REJECTED", "Reverse")).rejects.toThrow(
      /Cannot transition/,
    );
  });
});
