import { deriveTestDatabaseUrl } from "@loom/config";
import { describe, expect, it } from "vitest";
import { evaluationDatabaseUrl, isDemoStorage } from "./storage.ts";

describe("Session 3 auxiliary storage", () => {
  it("isolates evaluation from application and test files for either supported extension", () => {
    for (const extension of ["sqlite", "db"]) {
      const app = `sqlite:/tmp/session-03.${extension}`;
      expect(evaluationDatabaseUrl(app)).toBe(`sqlite:/tmp/session-03_eval.${extension}`);
      expect(new Set([app, deriveTestDatabaseUrl(app), evaluationDatabaseUrl(app)]).size).toBe(3);
    }
  });
  it("retains a dedicated evaluation database on the explicitly selected PostgreSQL server", () => {
    const url = new URL(evaluationDatabaseUrl("postgresql://loom:secret@localhost:55433/session03"));
    expect(url.host).toBe("localhost:55433");
    expect(url.pathname).toMatch(/^\/loom_s03_eval_[a-f0-9]+_test$/);
  });
  it("requires explicit demo storage rather than ordinary application or test files", () => {
    for (const url of [
      "sqlite:/tmp/session-03_demo.sqlite",
      "sqlite:/tmp/session-03_demo.db",
      "postgresql://loom@localhost/loom_demo",
    ])
      expect(isDemoStorage(url)).toBe(true);
    for (const url of [
      "sqlite:/tmp/session-03.sqlite",
      "sqlite:/tmp/session-03_test.sqlite",
      "postgresql://loom@localhost/loom",
    ])
      expect(isDemoStorage(url)).toBe(false);
  });
});
