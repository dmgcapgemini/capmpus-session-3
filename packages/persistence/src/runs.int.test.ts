import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  createRun,
  finishRun,
  getAnalysisResult,
  getRun,
  listRuns,
  markInterruptedRuns,
  saveAnalysisResult,
} from "./runs.ts";
import { openTestDatabase, truncateAll } from "./testing.ts";

const db = openTestDatabase();
afterAll(() => db.destroy());
beforeEach(() => truncateAll(db));

const totals = { modelCalls: 6, inputTokens: 25_400, outputTokens: 1_500, toolCalls: 4, deniedToolCalls: 1 };
const analysis = {
  actors: ["Dispatcher"],
  capabilities: ["Reassign routes"],
  externalSystems: ["ERP"],
  constraints: [],
  openQuestions: ["Who approves?"],
  evidence: [{ sourceId: "solution-brief", quotation: "route changes are made by phone" }],
};

const newRun = () =>
  createRun(db, { id: randomUUID(), task: "Analyse", clientProfile: "workshop", model: null });

describe("agent runs", () => {
  it("creates a running run", async () => {
    const run = await newRun();
    expect(run).toMatchObject({
      status: "running",
      finishedAt: null,
      toolCalls: 0,
      clientProfile: "workshop",
    });
    expect(await getRun(db, run.id)).toEqual(run);
  });

  it("finishes a running run once, with totals", async () => {
    const run = await newRun();
    const finished = await finishRun(db, run.id, {
      status: "completed",
      error: null,
      sessionId: "s-1",
      totals,
    });
    expect(finished).toMatchObject({ status: "completed", sessionId: "s-1", ...totals });
    expect(finished?.finishedAt).not.toBeNull();
    expect(
      await finishRun(db, run.id, { status: "failed", error: "late", sessionId: null, totals }),
    ).toBeUndefined();
  });

  it("lists the latest runs first", async () => {
    const first = await newRun();
    const second = await newRun();
    expect((await listRuns(db)).map((r) => r.id)).toEqual([second.id, first.id]);
  });

  it("marks runs interrupted by a restart as failed", async () => {
    const run = await newRun();
    expect(await markInterruptedRuns(db)).toBe(1);
    expect(await getRun(db, run.id)).toMatchObject({
      status: "failed",
      error: "interrupted: the API restarted",
    });
  });
});

describe("analysis results", () => {
  it("stores and reads the result of a run", async () => {
    const run = await newRun();
    const { id } = await saveAnalysisResult(db, run.id, analysis);
    expect(await getAnalysisResult(db, run.id)).toMatchObject({ id, agentRunId: run.id, result: analysis });
  });

  it("allows only one result per run", async () => {
    const run = await newRun();
    await saveAnalysisResult(db, run.id, analysis);
    await expect(saveAnalysisResult(db, run.id, analysis)).rejects.toThrow(/unique/i);
  });

  it("returns null when a run has no result", async () => {
    expect(await getAnalysisResult(db, (await newRun()).id)).toBeNull();
  });
});
