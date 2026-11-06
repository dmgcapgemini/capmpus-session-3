import type { CopilotCheck } from "@loom/agent-runtime";
import { compareVersions } from "@loom/agent-runtime";
import { describe, expect, it } from "vitest";
import {
  assessCopilot,
  checkBun,
  checkBunPackageManager,
  checkMigrations,
  databaseFailure,
} from "./checks.ts";

const bundled: CopilotCheck = {
  profile: "workshop",
  runtime: "bundled with @github/copilot-sdk",
  runtimeVersion: "1.0.83",
  authenticated: false,
};

const assess = (overrides: Partial<Parameters<typeof assessCopilot>[0]>) =>
  assessCopilot({
    check: bundled,
    bundledRuntimeVersion: "1.0.83",
    platform: "linux",
    compare: compareVersions,
    ...overrides,
  });

describe("preflight checks", () => {
  it("requires the exact Bun runtime and rejects Node compatibility masquerading as Bun", () => {
    expect(checkBun("1.4.0", "1.4.0", "bun@1.4.0", "1.4.0").status).toBe("pass");
    for (const actual of [undefined, "1.3.0", "1.4.1"]) {
      expect(checkBun(actual, "1.4.0", "bun@1.4.0", "1.4.0")).toMatchObject({ status: "fail" });
    }
  });

  it("rejects inconsistent repository version pins", () => {
    expect(checkBun("1.4.0", "1.4.0", "bun@1.3.0", "1.4.0").status).toBe("fail");
    expect(checkBun("1.4.0", "1.4.0", "bun@1.4.0", ">=1.4.0").status).toBe("fail");
    expect(checkBun("latest", "latest", "bun@latest", "latest").status).toBe("fail");
  });

  it("requires the pinned Bun package manager", () => {
    expect(checkBunPackageManager("bun/1.4.0 npm/? node/v24.0.0", "bun@1.4.0").status).toBe("pass");
    expect(checkBunPackageManager("bun/1.3.0", "bun@1.4.0").status).toBe("fail");
    expect(checkBunPackageManager(undefined, "bun@1.4.0").status).toBe("warn");
  });

  it("explains common database errors", () => {
    expect(
      databaseFailure("PostgreSQL", "url", "loom_session01", { error: "x", code: "ECONNREFUSED" }).fix,
    ).toMatch(/podman start loom-postgres/);
    expect(databaseFailure("PostgreSQL", "url", "loom_session01", { error: "x", code: "3D000" }).fix).toMatch(
      /createdb -U loom loom_session01/,
    );
  });

  it("warns about pending migrations", () => {
    expect(checkMigrations([]).status).toBe("pass");
    expect(checkMigrations(["s01-0001-agent-runs"])).toMatchObject({
      status: "warn",
      fix: "Run `bun run db:migrate`.",
    });
  });
});

describe("Copilot assessment", () => {
  it("passes when signed in", () => {
    const [runtime, signIn] = assess({ check: { ...bundled, authenticated: true, login: "member" } });
    expect(runtime?.status).toBe("pass");
    expect(signIn).toMatchObject({ status: "pass", detail: expect.stringContaining("member") });
  });

  it("tells a signed-out member to run copilot login", () => {
    expect(assess({})[1]).toMatchObject({ status: "fail", fix: expect.stringContaining("copilot login") });
  });

  it("recommends LOOM_COPILOT_CLI_PATH on macOS when only the installed CLI is signed in", () => {
    const installed = {
      ...bundled,
      runtime: "/opt/homebrew/bin/copilot",
      runtimeVersion: "1.0.84",
      authenticated: true,
    };
    const [, signIn] = assess({
      platform: "darwin",
      installedCli: { path: "/opt/homebrew/bin/copilot", check: installed },
    });
    expect(signIn).toMatchObject({
      status: "fail",
      fix: "Add to .env.local: LOOM_COPILOT_CLI_PATH=/opt/homebrew/bin/copilot",
    });
  });

  it("does not suggest the CLI path on Linux", () => {
    const installed = { ...bundled, authenticated: true };
    expect(assess({ installedCli: { path: "/usr/bin/copilot", check: installed } })[1]?.fix).toMatch(
      /copilot login/,
    );
  });

  it("warns when the installed CLI is older than the tested runtime", () => {
    const [runtime] = assess({
      check: { ...bundled, runtime: "/usr/local/bin/copilot", runtimeVersion: "1.0.70", authenticated: true },
    });
    expect(runtime).toMatchObject({ status: "warn", fix: expect.stringContaining("copilot update") });
  });

  it("explains a rejected token", () => {
    expect(assess({ check: { ...bundled, profile: "production" } })[1]?.fix).toMatch(/Copilot Requests/);
  });

  it("fails when the runtime does not start", () => {
    const [runtime] = assess({ check: { ...bundled, runtimeVersion: undefined, error: "spawn ENOENT" } });
    expect(runtime).toMatchObject({ status: "fail", detail: expect.stringContaining("ENOENT") });
  });
});
