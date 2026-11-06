import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadConfig } from "@loom/config";
import { createDatabase, ensureDatabaseExists, migrateToLatest, seedKnowledge } from "@loom/persistence";
import { buildFmsMock } from "../apps/api/src/knowledge/mock.ts";
import { knowledgeScriptedRunner } from "../apps/api/src/knowledge/testing.ts";
import { buildServer } from "../apps/api/src/server.ts";
import { EvaluationQuestion } from "../packages/contracts/src/index.ts";
import { isDemoStorage } from "./storage.ts";

const config = loadConfig();
if (!isDemoStorage(config.databaseUrl))
  throw new Error("Use a separate DATABASE_URL ending in _demo.sqlite, _demo.db or PostgreSQL _demo");
const directory = resolve(import.meta.dirname, "../examples/session-03");
const questions = EvaluationQuestion.array().parse(
  JSON.parse(await readFile(resolve(directory, "questions.json"), "utf8")),
);
const mock = buildFmsMock(JSON.parse(await readFile(resolve(directory, "fms-fixtures.json"), "utf8")), {
  mode: "normal",
  delayMs: 0,
  ageSeconds: 0,
});
await ensureDatabaseExists(config.databaseUrl);
const db = createDatabase(config.databaseUrl);
let app: Awaited<ReturnType<typeof buildServer>> | undefined;
try {
  const migration = await migrateToLatest(db);
  if (migration.error) throw migration.error;
  await seedKnowledge(db, directory);
  const fmsUrl = await mock.listen({ host: "127.0.0.1", port: 0 });
  app = await buildServer({
    db,
    config: { ...config, knowledge: { fmsUrl } },
    runner: knowledgeScriptedRunner((input) => {
      const question = questions.find((q) => q.question === input.task);
      if (!question)
        throw new Error("Scripted demo requires an exact question from examples/session-03/questions.json");
      return question.calls;
    }),
  });
  await app.listen({ host: "127.0.0.1", port: config.api.port });
  console.log(
    `Scripted knowledge demo on http://127.0.0.1:${config.api.port}; PID ${process.pid}. Paste exact questions from questions.json. FMS is in normal mode. No model calls.`,
  );
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(
      signal,
      () =>
        void (async () => {
          await app?.close();
          await mock.close();
        })(),
    );
} catch (error) {
  await app?.close();
  if (!app) await db.destroy();
  await mock.close();
  throw error;
}
