import { loadConfig } from "@loom/config";
import { RunDetail, type RunEvent } from "@loom/contracts";
import { createDatabase, migrateToLatest } from "@loom/persistence";
import { expect, it } from "vitest";
import { buildServer } from "../server.ts";

it("runs a real Copilot analysis through the API and records a controlled denial", async () => {
  const config = loadConfig();
  const db = createDatabase(config.testDatabaseUrl);
  const migration = await migrateToLatest(db);
  if (migration.error) {
    await db.destroy();
    throw migration.error;
  }
  const app = await buildServer({ config: { ...config, api: { port: 0, logLevel: "silent" } }, db });
  try {
    const task =
      'For a controlled policy demonstration, first attempt submit_analysis_result before reading any source, using empty actors, capabilities, externalSystems, constraints and openQuestions arrays and evidence [{"sourceId":"solution-brief","quotation":"FruitTrucks distributes fresh fruit"}]. Expect Loom to deny that call. Then list and read the permitted solution brief, analyse its actors, capabilities, systems, constraints and open questions, and submit a valid analysis with actual source quotations. Do not stop after the expected denial.';
    const start = await app.inject({ method: "POST", url: "/api/agent-runs", payload: { task } });
    expect(start.statusCode).toBe(202);
    const id = start.json().runId as string;
    const stream = await app.inject(`/api/agent-runs/${id}/events`);
    const trace = stream.body
      .split("\n")
      .filter((line) => line.startsWith("data: "))
      .map((line) => JSON.parse(line.slice(6)) as RunEvent);
    const detail = RunDetail.parse((await app.inject(`/api/agent-runs/${id}`)).json());
    expect(
      detail.run.status,
      detail.run.error ??
        JSON.stringify(trace.filter((e) => e.type === "tool.completed" || e.type === "error")),
    ).toBe("completed");
    expect(detail.result?.result.evidence.length).toBeGreaterThan(0);
    expect(trace.some((event) => event.type === "tool.denied" && event.rule === "read-before-submit")).toBe(
      true,
    );
    expect(trace.some((event) => event.type === "context.supplied")).toBe(true);
    const system = trace.filter((event) => event.type === "raw" && event.sdkType === "system.message");
    expect(JSON.stringify(system)).toContain("Loom's analysis agent");
    expect(JSON.stringify(system)).not.toContain("<environment_context>");
    console.info(
      JSON.stringify({
        runId: id,
        status: detail.run.status,
        model: detail.run.model,
        toolCalls: detail.run.toolCalls,
        deniedToolCalls: detail.run.deniedToolCalls,
        modelCalls: detail.run.modelCalls,
        inputTokens: detail.run.inputTokens,
        outputTokens: detail.run.outputTokens,
        eventTypes: [...new Set(trace.map((event) => event.type))],
      }),
    );
  } finally {
    await app.close();
  }
}, 240_000);
