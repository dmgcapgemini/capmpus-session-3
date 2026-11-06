import { resolve } from "node:path";
import { loadSourceRegistry } from "@loom/agent-tools";
import { loadConfig } from "@loom/config";
import { WorkflowDetail } from "@loom/contracts";
import { createDatabase, ensureDatabaseExists, migrateToLatest } from "@loom/persistence";
import { expect, it } from "vitest";
import { buildServer } from "../server.ts";

it("a live Copilot workflow stores a proposal and waits for an explicit review", async () => {
  const config = loadConfig();
  const url = new URL(config.databaseUrl);
  url.pathname = "/loom_session02_live_test";
  await ensureDatabaseExists(url.href);
  const db = createDatabase(url.href);
  const migration = await migrateToLatest(db);
  if (migration.error) {
    await db.destroy();
    throw migration.error;
  }
  const root = resolve(import.meta.dirname, "../../../..");
  const app = await buildServer({
    db,
    config: { ...config, databaseUrl: url.href, api: { port: 0, logLevel: "silent" } },
    registry: await loadSourceRegistry(resolve(root, "examples/session-02")),
  });
  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/workflows",
      payload: {
        task: "Analyse the FruitTrucks brief. Read the source and submit a concise grounded analysis for human review.",
        maxAttempts: 1,
      },
    });
    expect(response.statusCode).toBe(202);
    const id = response.json().id;
    await expect
      .poll(async () => (await app.inject(`/api/workflows/${id}`)).json().workflow.state, {
        timeout: 55000,
        interval: 500,
      })
      .toBe("AWAITING_REVIEW");
    const detail = WorkflowDetail.parse((await app.inject(`/api/workflows/${id}`)).json());
    expect(detail.result?.result.evidence.length).toBeGreaterThan(0);
    expect(detail.events.map((event) => event.to)).toEqual([
      "CREATED",
      "ANALYSING",
      "PROPOSAL_READY",
      "AWAITING_REVIEW",
    ]);
    console.info(
      `Live Session 2 workflow ${id}; run ${detail.workflow.runId}; result ${detail.result?.id}; awaiting human review`,
    );
  } finally {
    await app.close();
  }
});
