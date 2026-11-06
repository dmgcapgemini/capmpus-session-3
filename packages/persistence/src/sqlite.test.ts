import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { KnowledgeAnswer, RetrievalReport, RunDiagnostics } from "@loom/contracts";
import { describe, expect, it } from "vitest";
import { createDatabase } from "./database.ts";
import { checkDatabase } from "./health.ts";
import {
  appendRetrieval,
  createKnowledgeQuery,
  getKnowledgeQuery,
  saveKnowledgeAnswer,
} from "./knowledge.ts";
import { migrateToLatest } from "./migrate.ts";
import { createRun, finishRun, getAnalysisResult, getRun, saveAnalysisResult } from "./runs.ts";
import { claimWorkflowAttempt, createWorkflow, workflowDetail } from "./workflows.ts";

const analysis = {
  actors: ["Dispatcher"],
  capabilities: ["Reassign routes"],
  externalSystems: ["ERP"],
  constraints: [],
  openQuestions: ["Who approves?"],
  evidence: [{ sourceId: "solution-brief", quotation: "route changes" }],
};

describe("Session 3 SQLite persistence", () => {
  it("atomically appends concurrent reports and reopens answers and diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "loom-sqlite-knowledge-reopen-"));
    const url = `sqlite:${join(root, "knowledge.sqlite")}`;
    let db = createDatabase(url);
    try {
      expect((await migrateToLatest(db)).error).toBeUndefined();
      const run = await createRun(db, {
        id: randomUUID(),
        task: "Inspect evidence",
        clientProfile: "workshop",
        model: null,
      });
      await createKnowledgeQuery(db, run.id);
      const reports: RetrievalReport[] = Array.from({ length: 20 }, (_, i) => ({
        id: randomUUID(),
        adapter: "documents",
        input: { query: `query ${i}` },
        at: new Date().toISOString(),
        items: [],
        rejected: [],
        error: null,
      }));
      await Promise.all(reports.map((report) => appendRetrieval(db, run.id, report)));
      const answer: KnowledgeAnswer = {
        answer: "",
        uncertainty: "No eligible evidence",
        citations: [],
        evidence: [],
        conflicts: [],
        createdAt: new Date().toISOString(),
      };
      await saveKnowledgeAnswer(db, run.id, answer);
      await expect(
        saveKnowledgeAnswer(db, run.id, { ...answer, uncertainty: "replacement" }),
      ).rejects.toThrow(/already stored/);
      const diagnostics: RunDiagnostics = {
        termination: "completed",
        recoveries: 0,
        submissionAttempts: 1,
        assistantMessages: [],
        events: [],
        truncated: false,
      };
      await finishRun(db, run.id, {
        status: "completed",
        error: null,
        sessionId: null,
        totals: { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, deniedToolCalls: 0 },
        diagnostics,
      });
      const before = await getKnowledgeQuery(db, run.id);
      expect(before?.reports).toEqual(reports);
      await db.destroy();
      db = createDatabase(url);
      expect(await getKnowledgeQuery(db, run.id)).toEqual(before);
      expect((await getRun(db, run.id))?.diagnostics).toEqual(diagnostics);
    } finally {
      await db.destroy();
      await rm(root, { recursive: true, force: true });
    }
  });
  it("reopens workflow state, attempt ownership and audit history from the same file", async () => {
    const root = await mkdtemp(join(tmpdir(), "loom-sqlite-workflow-reopen-"));
    const url = `sqlite:${join(root, "workflow.sqlite")}`;
    let db = createDatabase(url);
    try {
      expect((await migrateToLatest(db)).error).toBeUndefined();
      const workflow = await createWorkflow(db, "Resume this analysis");
      const run = await createRun(db, {
        id: randomUUID(),
        task: workflow.task,
        clientProfile: "workshop",
        model: null,
      });
      await claimWorkflowAttempt(db, workflow.id, workflow.version, run.id);
      const before = await workflowDetail(db, workflow.id);
      await db.destroy();
      db = createDatabase(url);
      expect(await workflowDetail(db, workflow.id)).toEqual(before);
      expect(before.workflow).toMatchObject({ state: "ANALYSING", attempt: 1, runId: run.id });
    } finally {
      await db.destroy();
      await rm(root, { recursive: true, force: true });
    }
  });
  it("reopens a file with runs, structured results and timestamp contracts intact", async () => {
    const root = await mkdtemp(join(tmpdir(), "loom-sqlite-reopen-"));
    const url = `sqlite:${join(root, "application.sqlite")}`;
    let db = createDatabase(url);
    try {
      expect((await migrateToLatest(db)).error).toBeUndefined();
      const run = await createRun(db, {
        id: randomUUID(),
        task: "Analyse",
        clientProfile: "workshop",
        model: null,
      });
      const result = await saveAnalysisResult(db, run.id, analysis);
      await db.destroy();
      db = createDatabase(url);
      expect(await getRun(db, run.id)).toEqual(run);
      const saved = await getAnalysisResult(db, run.id);
      expect(saved).toMatchObject({ id: result.id, result: analysis });
      expect(Number.isFinite(new Date(saved?.createdAt ?? "").getTime())).toBe(true);
      expect(await checkDatabase(db)).toMatchObject({
        reachable: true,
        schemaVersion: "s03-0002-run-diagnostics",
      });
      await expect(saveAnalysisResult(db, run.id, analysis)).rejects.toThrow(/unique/i);
      await expect(saveAnalysisResult(db, randomUUID(), analysis)).rejects.toThrow(/foreign key/i);
    } finally {
      await db.destroy();
      await rm(root, { recursive: true, force: true });
    }
  });
  it("keeps separate application and test files isolated", async () => {
    const root = await mkdtemp(join(tmpdir(), "loom-sqlite-isolation-"));
    const app = createDatabase(`sqlite:${join(root, "application.sqlite")}`);
    const test = createDatabase(`sqlite:${join(root, "application_test.sqlite")}`);
    try {
      expect((await migrateToLatest(app)).error).toBeUndefined();
      expect((await migrateToLatest(test)).error).toBeUndefined();
      const run = await createRun(app, {
        id: randomUUID(),
        task: "Keep",
        clientProfile: "workshop",
        model: null,
      });
      expect(await getRun(test, run.id)).toBeUndefined();
      expect(await getRun(app, run.id)).toEqual(run);
    } finally {
      await app.destroy();
      await test.destroy();
      await rm(root, { recursive: true, force: true });
    }
  });
});
