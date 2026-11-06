import { describe, expect, it } from "vitest";
import { ConfigError, deriveTestDatabaseUrl, loadConfig, parseConfig, redactDatabaseUrl } from "./index.ts";

const base = { DATABASE_URL: "postgresql://loom:loom-dev@localhost:5432/loom_session01" };

describe("config", () => {
  it("applies defaults", () => {
    const config = loadConfig(base);
    expect(config.api.port).toBe(3000);
    expect(config.web.port).toBe(5173);
    expect(config.api.logLevel).toBe("info");
    expect(config.sources.dir).toBe("examples/session-03");
    expect(config.copilot).toEqual({ cliPath: undefined, gitHubToken: undefined, model: undefined });
  });

  it("derives the test database from the main database", () => {
    expect(loadConfig(base).testDatabaseUrl).toBe(
      "postgresql://loom:loom-dev@localhost:5432/loom_session01_test",
    );
    expect(deriveTestDatabaseUrl("postgresql://a:b@h:1/x_test")).toBe("postgresql://a:b@h:1/x_test");
  });

  it("prefers an explicit test database", () => {
    const config = loadConfig({ ...base, DATABASE_URL_TEST: "postgresql://loom:x@localhost:5433/other" });
    expect(config.testDatabaseUrl).toBe("postgresql://loom:x@localhost:5433/other");
  });

  it("treats empty optional values as unset", () => {
    const config = loadConfig({ ...base, LOOM_GITHUB_TOKEN: "", LOOM_COPILOT_CLI_PATH: "  " });
    expect(config.copilot.gitHubToken).toBeUndefined();
    expect(config.copilot.cliPath).toBeUndefined();
  });

  it("reports every invalid variable", () => {
    const result = parseConfig({ DATABASE_URL: "mysql://nope", LOOM_API_PORT: "99999" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.join("\n")).toMatch(/DATABASE_URL/);
    expect(result.issues.join("\n")).toMatch(/LOOM_API_PORT/);
  });

  it("throws a readable error when DATABASE_URL is missing", () => {
    expect(() => loadConfig({})).toThrow(ConfigError);
    expect(() => loadConfig({})).toThrow(/DATABASE_URL is required/);
  });

  it("never prints the database password", () => {
    expect(redactDatabaseUrl(base.DATABASE_URL)).toBe(
      "postgresql://loom:*****@localhost:5432/loom_session01",
    );
  });
});

describe("Session 3 SQLite configuration", () => {
  it("resolves application storage and a separate test file", () => {
    const config = loadConfig({ DATABASE_URL: "sqlite:./.loom/session-01.sqlite" });
    expect(config.databaseUrl).toMatch(/\/\.loom\/session-01\.sqlite$/);
    expect(config.testDatabaseUrl).toMatch(/\/\.loom\/session-01_test\.sqlite$/);
    expect(config.databaseUrl).not.toBe(config.testDatabaseUrl);
  });
  it("rejects tests that would share the application file", () => {
    expect(() =>
      loadConfig({ DATABASE_URL: "sqlite:./.loom/a.sqlite", DATABASE_URL_TEST: "sqlite:./.loom/a.sqlite" }),
    ).toThrow(/separate SQLite/);
  });
  it("keeps file derivation idempotent", () => {
    expect(deriveTestDatabaseUrl("sqlite:./a_test.sqlite")).toBe("sqlite:./a_test.sqlite");
  });
  it("requires persistent file storage in participant configuration", () => {
    expect(parseConfig({ DATABASE_URL: "sqlite::memory:" }).ok).toBe(false);
  });
});
