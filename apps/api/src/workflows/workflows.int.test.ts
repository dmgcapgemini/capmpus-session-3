import { randomUUID } from "node:crypto";
import type { AgentRunner, RunInput } from "@loom/agent-runtime";
import { ScriptedAgentRunner } from "@loom/agent-runtime/testing";
import { loadSourceRegistry } from "@loom/agent-tools";
import { BRIEF, makeSourcesDir, validAnalysis } from "@loom/agent-tools/testing";
import { loadConfig } from "@loom/config";
import {
  claimWorkflowAttempt,
  createRun,
  createWorkflow,
  getWorkflow,
  requestWorkflowReview,
  workflowDetail,
  workflowResultStore,
} from "@loom/persistence";
import { openTestDatabase, truncateAll } from "@loom/persistence/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RunService } from "../runs/service.ts";
import { buildServer } from "../server.ts";
import { WorkflowService } from "./service.ts";

const success = () =>
  new ScriptedAgentRunner([
    { tool: "read_source", args: { sourceId: "solution-brief" } },
    { tool: "submit_analysis_result", args: validAnalysis() },
  ]);
let db: ReturnType<typeof openTestDatabase>;
let runs: RunService | undefined;
let workflows: WorkflowService | undefined;
beforeEach(async () => {
  db = openTestDatabase();
  await truncateAll(db);
});
afterEach(async () => {
  workflows?.stopScheduling();
  await runs?.close();
  await workflows?.close();
  runs = undefined;
  workflows = undefined;
  await db.destroy();
});
async function setup(runner: AgentRunner = success()) {
  runs = new RunService(
    db,
    await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF })),
    runner,
    () => {},
  );
  workflows = new WorkflowService(db, runs, () => {});
  await runs.initialize();
  await workflows.initialize();
  return workflows;
}
async function interrupted(maxAttempts = 3) {
  const w = await createWorkflow(db, "Analyse", maxAttempts);
  const run = await createRun(db, { id: randomUUID(), task: w.task, clientProfile: "workshop", model: null });
  return claimWorkflowAttempt(db, w.id, w.version, run.id);
}
describe("workflow outer loop", () => {
  it("workshop session-02: recovers a workflow queued before the process stopped", async () => {
    const w = await createWorkflow(db, "Queued before restart");
    const service = await setup();
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "AWAITING_REVIEW", attempt: 1 });
  });
  it("workshop session-02: graceful shutdown remains recoverable rather than a human stop", async () => {
    const service = await setup(new ScriptedAgentRunner([{ waitForStop: true }]));
    const w = await service.create("Shutdown recovery", 3);
    const pending = service.drain();
    await expect.poll(async () => (await getWorkflow(db, w.id)).runId).not.toBeNull();
    service.stopScheduling();
    await runs?.close();
    await pending;
    await service.close();
    const restarted = await setup();
    await restarted.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "AWAITING_REVIEW", attempt: 2 });
  });
  it("keeps a committed proposal reviewable when the invocation later fails", async () => {
    const service = await setup(
      new ScriptedAgentRunner([
        { tool: "read_source", args: { sourceId: "solution-brief" } },
        { tool: "submit_analysis_result", args: validAnalysis() },
        { fail: "Provider disconnected after storing result" },
      ]),
    );
    const w = await service.create("Analyse", 3);
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "AWAITING_REVIEW", attempt: 1 });
    expect((await workflowDetail(db, w.id)).result).not.toBeNull();
  });

  it("retries a failed invocation and waits for review without accepting", async () => {
    let starts = 0;
    const runner = success();
    const start = runner.start.bind(runner);
    runner.start = (input: RunInput) =>
      ++starts === 1
        ? new ScriptedAgentRunner([{ fail: "Provider unavailable" }]).start(input)
        : start(input);
    const service = await setup(runner);
    const w = await service.create("Analyse", 3);
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "ANALYSING", attempt: 1 });
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "AWAITING_REVIEW", attempt: 2 });
    expect((await workflowDetail(db, w.id)).events.filter((e) => e.to === "ANALYSING")).toHaveLength(2);
  });
  it("fails after exactly the allowed attempts", async () => {
    const service = await setup(new ScriptedAgentRunner([{ fail: "Offline" }]));
    const w = await service.create("Analyse", 2);
    await service.drain();
    await service.drain();
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "FAILED", attempt: 2, error: "Offline" });
  });
  it("retries incomplete output without fabricating a proposal", async () => {
    const service = await setup(new ScriptedAgentRunner([{ say: "No result" }]));
    const w = await service.create("Analyse", 1);
    await service.drain();
    expect(await workflowDetail(db, w.id)).toMatchObject({
      workflow: { state: "FAILED", attempt: 1 },
      result: null,
    });
  });
  it("workshop session-02: resumes an interrupted attempt after restart", async () => {
    const w = await interrupted();
    const service = await setup();
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "AWAITING_REVIEW", attempt: 2 });
  });
  it("workshop session-02: recovers committed proposals without another invocation", async () => {
    const w = await interrupted();
    await (await workflowResultStore(db, w.id)).save(w.runId as string, validAnalysis());
    const service = await setup(new ScriptedAgentRunner([{ fail: "Must not invoke" }]));
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "AWAITING_REVIEW", attempt: 1 });
  });
  it("workshop session-02: exhausts an interrupted final attempt on startup", async () => {
    const w = await interrupted(1);
    await setup();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "FAILED", attempt: 1 });
  });
  it("does not consume an attempt when the run slot is busy", async () => {
    const service = await setup(new ScriptedAgentRunner([{ waitForStop: true }]));
    await runs?.start("Standalone run");
    const w = await service.create("Queued", 3);
    await service.drain();
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "CREATED", attempt: 0 });
  });
  it("stopping an invocation fails without retry", async () => {
    const service = await setup(new ScriptedAgentRunner([{ waitForStop: true }]));
    const w = await service.create("Analyse", 3);
    const pending = service.drain();
    await expect.poll(async () => (await getWorkflow(db, w.id)).runId).not.toBeNull();
    const current = await getWorkflow(db, w.id);
    await runs?.stop(current.runId as string);
    await pending;
    expect(await getWorkflow(db, w.id)).toMatchObject({ state: "FAILED", attempt: 1 });
  });
  it("denies an agent acceptance tool", async () => {
    const service = await setup(new ScriptedAgentRunner([{ tool: "accept_workflow", args: {} }]));
    const w = await service.create("Accept yourself", 1);
    await service.drain();
    const detail = await workflowDetail(db, w.id);
    expect(detail.workflow.state).toBe("FAILED");
    expect((await runs?.detail(detail.workflow.runId as string))?.run.deniedToolCalls).toBe(1);
  });
  it("workshop session-02: duplicate tool calls return the same result", async () => {
    const service = await setup(
      new ScriptedAgentRunner([
        { tool: "read_source", args: { sourceId: "solution-brief" } },
        { tool: "submit_analysis_result", args: validAnalysis() },
        { tool: "submit_analysis_result", args: validAnalysis() },
      ]),
    );
    const w = await service.create("Analyse", 3);
    await service.drain();
    const current = await getWorkflow(db, w.id);
    const events = runs?.hub.get(current.runId as string)?.events;
    expect(events?.filter((e) => e.type === "tool.completed" && !e.success)).toHaveLength(0);
    expect(current.state).toBe("AWAITING_REVIEW");
  });
});

describe("workflow HTTP review", () => {
  it("workshop session-02: human review succeeds once and stale decisions conflict", async () => {
    const w = await interrupted();
    await (await workflowResultStore(db, w.id)).save(w.runId as string, validAnalysis());
    const ready = await requestWorkflowReview(db, w.id, 2);
    const app = await buildServer({
      db,
      config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
      runner: success(),
      registry: await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF })),
    });
    try {
      const accepted = await app.inject({
        method: "POST",
        url: `/api/workflows/${w.id}/accept`,
        payload: { version: ready.version, reason: "Evidence checked" },
      });
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json().state).toBe("ACCEPTED");
      const stale = await app.inject({
        method: "POST",
        url: `/api/workflows/${w.id}/reject`,
        payload: { version: ready.version, reason: "Too late" },
      });
      expect(stale.statusCode).toBe(409);
      expect((await app.inject(`/api/workflows/${w.id}`)).json().events).toHaveLength(5);
    } finally {
      await app.close();
    }
  });
});
