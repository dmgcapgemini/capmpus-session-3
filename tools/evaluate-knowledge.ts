import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "@loom/config";
import { createDatabase, ensureDatabaseExists, migrateToLatest, seedKnowledge } from "@loom/persistence";
import { scoreKnowledgeQuestion } from "../apps/api/src/knowledge/evaluation.ts";
import { buildFmsMock, type MockOptions } from "../apps/api/src/knowledge/mock.ts";
import { knowledgeScriptedRunner } from "../apps/api/src/knowledge/testing.ts";
import { buildServer } from "../apps/api/src/server.ts";
import { EvaluationQuestion, KnowledgeQueryDetail } from "../packages/contracts/src/index.ts";
import { evaluationDatabaseUrl } from "./storage.ts";

const mode = process.argv[2] ?? "scripted";
if (!["scripted", "live"].includes(mode)) throw new Error("Mode must be scripted or live");
const config = loadConfig();
const evaluationUrl = evaluationDatabaseUrl(config.databaseUrl);
await ensureDatabaseExists(evaluationUrl);
const db = createDatabase(evaluationUrl);
const root = resolve(import.meta.dirname, "..");
const dataDir = resolve(root, "examples/session-03");
const options: MockOptions = { mode: "normal", delayMs: 0, ageSeconds: 0 };
const mock = buildFmsMock(JSON.parse(await readFile(resolve(dataDir, "fms-fixtures.json"), "utf8")), options);
let app: Awaited<ReturnType<typeof buildServer>> | undefined;
try {
  const migration = await migrateToLatest(db);
  if (migration.error) throw migration.error;
  await seedKnowledge(db, dataDir);
  const questions = EvaluationQuestion.array().parse(
    JSON.parse(await readFile(resolve(dataDir, "questions.json"), "utf8")),
  );
  let current = questions[0];
  const fmsUrl = await mock.listen({ host: "127.0.0.1", port: 0 });
  app = await buildServer({
    db,
    config: { ...config, api: { ...config.api, logLevel: "silent" }, knowledge: { fmsUrl } },
    ...(mode === "scripted" ? { runner: knowledgeScriptedRunner(() => current?.calls ?? []) } : {}),
  });
  const rows = [];
  for (const question of questions) {
    current = question;
    options.mode = question.fmsMode;
    const start = await app.inject({
      method: "POST",
      url: "/api/knowledge",
      payload: { task: question.question },
    });
    if (start.statusCode !== 202) throw new Error(`Could not start ${question.id}: ${start.body}`);
    const id = start.json().runId;
    let detail: KnowledgeQueryDetail;
    const deadline = Date.now() + 90000;
    do {
      detail = KnowledgeQueryDetail.parse((await app.inject(`/api/knowledge/${id}`)).json());
      if (detail.run.status !== "running") break;
      if (Date.now() > deadline) {
        await app.inject({ method: "POST", url: `/api/agent-runs/${id}/stop` });
        throw new Error(`Question ${question.id} timed out`);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    } while (detail.run.status === "running");
    const row = scoreKnowledgeQuestion(question, detail);
    rows.push(row);
    console.log(
      `${row.passed ? "PASS" : "FAIL"} ${question.id}: ${row.actualAdapters.join(", ")} (${row.evidenceRefs.length} citations)`,
    );
  }
  const report = {
    mode,
    claim:
      mode === "scripted"
        ? "Deterministic plumbing evaluation; not model selection accuracy"
        : "Observed Copilot selection on this question set; model outputs may vary",
    at: new Date().toISOString(),
    passed: rows.filter((r) => r.passed).length,
    total: rows.length,
    rows,
  };
  await mkdir(resolve(root, ".loom"), { recursive: true });
  const output = resolve(root, `.loom/knowledge-evaluation-${mode}.json`);
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${report.passed}/${report.total} passed. ${output}`);
  if (report.passed !== report.total) process.exitCode = 1;
} finally {
  await app?.close();
  if (!app) await db.destroy();
  await mock.close();
}
