import { resolve } from "node:path";
import { ScriptedAgentRunner } from "@loom/agent-runtime/testing";
import { loadConfig } from "@loom/config";
import { type EvaluationQuestion, KnowledgeQueryDetail } from "@loom/contracts";
import { seedKnowledge } from "@loom/persistence";
import { openTestDatabase, sql, truncateAll } from "@loom/persistence/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isSQLite } from "../../../../packages/persistence/src/sqlite.ts";
import { buildServer } from "../server.ts";
import { scoreKnowledgeQuestion } from "./evaluation.ts";
import { knowledgeScriptedRunner } from "./testing.ts";

const root = resolve(import.meta.dirname, "../../../..");
let app: FastifyInstance | undefined;
beforeEach(async () => {
  const db = openTestDatabase();
  try {
    await truncateAll(db);
    await seedKnowledge(db, resolve(root, "examples/session-03"));
  } finally {
    await db.destroy();
  }
});
afterEach(async () => {
  await app?.close();
  app = undefined;
});
async function setup(calls: EvaluationQuestion["calls"]) {
  app = await buildServer({
    db: openTestDatabase(),
    config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
    runner: knowledgeScriptedRunner(() => calls),
  });
}
async function ask() {
  const response = await app?.inject({
    method: "POST",
    url: "/api/knowledge",
    payload: { task: "Inspect the requested knowledge sources" },
  });
  expect(response?.statusCode).toBe(202);
  const id = response?.json().runId;
  await expect
    .poll(async () => (await app?.inject(`/api/knowledge/${id}`))?.json().run.status)
    .not.toBe("running");
  return KnowledgeQueryDetail.parse((await app?.inject(`/api/knowledge/${id}`))?.json());
}
describe("knowledge query API", () => {
  it("workshop session-03: persists conflicts, citations and provenance through restart", async () => {
    const calls: EvaluationQuestion["calls"] = [
      { adapter: "documents", input: { query: "route acknowledgement" } },
    ];
    await setup(calls);
    const result = await ask();
    expect(result.run.status).toBe("completed");
    expect(result.answer?.conflicts[0]?.key).toBe("route.change.acknowledgement");
    expect(result.answer?.citations).toHaveLength(2);
    await app?.close();
    await setup([]);
    expect(
      KnowledgeQueryDetail.parse((await app?.inject(`/api/knowledge/${result.run.id}`))?.json()),
    ).toEqual(result);
  });
  it("completes an explicitly uncertain answer without evidence", async () => {
    await setup([{ adapter: "documents", input: { query: "nonexistent-astronomical-term" } }]);
    const result = await ask();
    expect(result.run.status).toBe("completed");
    expect(result.answer).toMatchObject({ answer: "", citations: [] });
    expect(result.answer?.uncertainty).not.toBe("");
  });
  it("rejects fabricated citations instead of storing an ungrounded answer", async () => {
    app = await buildServer({
      db: openTestDatabase(),
      config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
      runner: new ScriptedAgentRunner([
        {
          tool: "submit_knowledge_answer",
          args: {
            answer: "An invented fact",
            uncertainty: "",
            citations: [{ evidenceRef: "doc:operations-manual", quotation: "An invented quotation" }],
          },
        },
      ]),
    });
    const result = await ask();
    expect(result.run.status).toBe("incomplete");
    expect(result.answer).toBeNull();
    expect(result.run.diagnostics).toMatchObject({
      termination: "submission_rejected",
      submissionAttempts: 1,
    });
    expect(result.run.diagnostics?.events.some((event) => event.kind === "submission_rejected")).toBe(true);
  });
  it("preserves unsaved model text and the missing-submission diagnosis after restart", async () => {
    app = await buildServer({
      db: openTestDatabase(),
      config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
      runner: new ScriptedAgentRunner([
        { tool: "lookup_records", args: { entity: "driver", id: "D-101" } },
        { say: "The driver holds a C1 licence." },
      ]),
    });
    const result = await ask();
    expect(result.run.status).toBe("incomplete");
    expect(result.answer).toBeNull();
    expect(result.reports).toHaveLength(1);
    expect(result.run.diagnostics).toMatchObject({
      termination: "missing_submission",
      submissionAttempts: 0,
      assistantMessages: [{ content: "The driver holds a C1 licence." }],
    });
    await app.close();
    await setup([]);
    const restored = KnowledgeQueryDetail.parse(
      (await app?.inject(`/api/knowledge/${result.run.id}`))?.json(),
    );
    expect(restored.run.diagnostics).toEqual(result.run.diagnostics);
    expect(restored.answer).toBeNull();
  });
  it("distinguishes actual database storage failure from model omission and validation rejection", async () => {
    const db = openTestDatabase();
    if (!isSQLite(db))
      await sql`create function fail_knowledge_answer_test() returns trigger language plpgsql as $$ begin raise exception 'private storage detail'; end $$`.execute(
        db,
      );
    try {
      if (isSQLite(db))
        await sql`create trigger fail_knowledge_answer_test before update of answer on knowledge_queries begin select raise(abort, 'private storage detail'); end`.execute(
          db,
        );
      else
        await sql`create trigger fail_knowledge_answer_test before update of answer on knowledge_queries for each row execute function fail_knowledge_answer_test()`.execute(
          db,
        );
      await setup([{ adapter: "documents", input: { query: "route acknowledgement" } }]);
      const result = await ask();
      expect(result.answer).toBeNull();
      expect(result.run.status).toBe("incomplete");
      expect(result.run.diagnostics).toMatchObject({ termination: "storage_error", submissionAttempts: 1 });
      expect(result.run.error).toContain("failed during storage");
      expect(JSON.stringify(result.run.diagnostics)).not.toContain("private storage detail");
    } finally {
      if (isSQLite(db)) await sql`drop trigger if exists fail_knowledge_answer_test`.execute(db);
      else {
        await sql`drop trigger if exists fail_knowledge_answer_test on knowledge_queries`.execute(db);
        await sql`drop function fail_knowledge_answer_test()`.execute(db);
      }
      await db.destroy();
    }
  });
  it("reports extra source access as an evaluation selection failure", async () => {
    await setup([{ adapter: "documents", input: { query: "route acknowledgement" } }]);
    const result = await ask();
    const score = scoreKnowledgeQuestion(
      {
        id: "wrong-source",
        question: "What licence?",
        expectedAdapters: ["records"],
        expectedEvidence: ["record:driver:D-101"],
        calls: [],
        expectedConflictKeys: [],
        expectedRejectedSources: [],
        expectedFailure: false,
        fmsMode: "normal",
      },
      result,
    );
    expect(score.actualAdapters).toEqual(["documents"]);
    expect(score.checks.selection).toBe(false);
    expect(score.passed).toBe(false);
  });
  it("does not score missing or wrong question evidence as a pass", async () => {
    await setup([{ adapter: "documents", input: { query: "route acknowledgement" } }]);
    const result = await ask();
    const question: EvaluationQuestion = {
      id: "evidence-boundary",
      question: "Compare the route sources",
      expectedAdapters: ["documents"],
      expectedEvidence: ["doc:operations-manual", "doc:dispatcher-interview"],
      calls: [],
      expectedConflictKeys: ["route.change.acknowledgement"],
      expectedRejectedSources: [],
      expectedFailure: false,
      fmsMode: "normal",
    };
    expect(scoreKnowledgeQuestion(question, result).checks.evidence).toBe(true);
    if (!result.answer) throw new Error("Expected stored answer");
    const empty = {
      ...result,
      answer: { ...result.answer, answer: "", uncertainty: "I do not know", citations: [] },
    };
    expect(scoreKnowledgeQuestion(question, empty).checks.evidence).toBe(false);
    expect(
      scoreKnowledgeQuestion({ ...question, expectedEvidence: ["doc:other-manual"] }, result).checks.evidence,
    ).toBe(false);
  });
  it("returns 404 for unknown questions and 400 for malformed input", async () => {
    await setup([]);
    expect((await app?.inject("/api/knowledge/00000000-0000-4000-8000-000000000000"))?.statusCode).toBe(404);
    expect(
      (await app?.inject({ method: "POST", url: "/api/knowledge", payload: { task: "" } }))?.statusCode,
    ).toBe(400);
  });
});
