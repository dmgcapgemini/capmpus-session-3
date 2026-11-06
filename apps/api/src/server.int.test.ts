import { loadConfig } from "@loom/config";
import { HealthResponse } from "@loom/contracts";
import { openTestDatabase } from "@loom/persistence/testing";
import { afterAll, describe, expect, it } from "vitest";
import { buildServer } from "./server.ts";

const app = await buildServer({
  config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
  db: openTestDatabase(),
});

afterAll(() => app.close());

describe("GET /api/health", () => {
  it("reports the database and schema version", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    expect(response.statusCode).toBe(200);
    const body = HealthResponse.parse(response.json());
    expect(body).toMatchObject({
      status: "ok",
      database: { reachable: true, schemaVersion: "s03-0002-run-diagnostics" },
    });
  });
});
