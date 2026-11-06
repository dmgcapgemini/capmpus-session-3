import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ScriptedAgentRunner } from "@loom/agent-runtime/testing";
import { loadConfig } from "@loom/config";
import { createDatabase, ensureDatabaseExists, migrateToLatest } from "@loom/persistence";
import { buildServer } from "../apps/api/src/server.ts";
import { loadSourceRegistry } from "../packages/agent-tools/src/index.ts";
import { SubmitAnalysisInput } from "../packages/contracts/src/index.ts";
import { isDemoStorage } from "./storage.ts";

const mode = process.argv[2] ?? "fail-once";
if (!["hold", "fail-once", "fail-always", "succeed"].includes(mode))
  throw new Error("Mode: hold | fail-once | fail-always | succeed");
const config = loadConfig();
// This explicit fixture server never contacts Copilot and must not share the ordinary workshop DB.
if (!isDemoStorage(config.databaseUrl))
  throw new Error("Set DATABASE_URL to a dedicated _demo.sqlite file or PostgreSQL database ending in _demo");
const root = resolve(import.meta.dirname, "..");
const dir = resolve(root, "examples/session-02");
const fixture = JSON.parse(await readFile(resolve(dir, "failure-scenario.json"), "utf8"));
const analysis = SubmitAnalysisInput.parse(fixture.analysis);
if (typeof fixture.failureMessage !== "string") throw new Error("Invalid failure fixture");
await ensureDatabaseExists(config.databaseUrl);
const db = createDatabase(config.databaseUrl);
const migration = await migrateToLatest(db);
if (migration.error) {
  await db.destroy();
  throw migration.error;
}
const runner = new ScriptedAgentRunner([]);
let invocations = 0;
runner.start = (input) => {
  invocations++;
  const script =
    mode === "hold"
      ? new ScriptedAgentRunner([{ waitForStop: true }])
      : mode === "fail-always" || (mode === "fail-once" && invocations === 1)
        ? new ScriptedAgentRunner([{ fail: fixture.failureMessage }])
        : new ScriptedAgentRunner([
            { tool: "read_source", args: { sourceId: "solution-brief" } },
            { tool: "submit_analysis_result", args: analysis },
            { tool: "submit_analysis_result", args: analysis },
            { tool: "accept_workflow", args: {} },
          ]);
  return script.start(input);
};
const app = await buildServer({ config, db, runner, registry: await loadSourceRegistry(dir) });
await app.listen({ host: "127.0.0.1", port: config.api.port });
console.info(
  `Workflow fixture: ${mode}; PID ${process.pid}; http://127.0.0.1:${config.api.port}. No model calls. Use a separate terminal for the web app.`,
);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => void app.close());
