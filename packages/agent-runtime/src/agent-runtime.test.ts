import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveClientOptions } from "./client-options.ts";
import { compareVersions, readSdkInfo } from "./sdk-info.ts";

describe("resolveClientOptions", () => {
  it("uses the member's login in copilot-cli mode by default", () => {
    const resolved = resolveClientOptions({});
    expect(resolved.profile).toBe("workshop");
    expect(resolved.options.mode).toBe("copilot-cli");
    expect(resolved.options.gitHubToken).toBeUndefined();
    expect(resolved.options.connection).toBeUndefined();
    expect(resolved.runtime).toBe("bundled with @github/copilot-sdk");
  });

  it("switches to server-safe empty mode with an isolated home when a token is set", () => {
    const resolved = resolveClientOptions(
      { gitHubToken: "github_pat_example" },
      { workspaceRoot: resolve("work", "loom") },
    );
    expect(resolved.profile).toBe("production");
    expect(resolved.options.mode).toBe("empty");
    expect(resolved.options.gitHubToken).toBe("github_pat_example");
    expect(resolved.options.baseDirectory).toBe(resolve("work", "loom", ".loom", "copilot-home"));
  });

  it("uses the installed CLI when a path is configured", () => {
    const resolved = resolveClientOptions({ cliPath: "/opt/homebrew/bin/copilot" });
    expect(resolved.runtime).toBe("/opt/homebrew/bin/copilot");
    expect(resolved.options.connection).toBeDefined();
  });
});

describe("sdk info", () => {
  it("reads the pinned SDK and bundled runtime versions", () => {
    const info = readSdkInfo();
    expect(info.sdkVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(info.bundledRuntimeVersion).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("compares versions numerically", () => {
    expect(compareVersions("1.0.84-5", "1.0.83")).toBe(1);
    expect(compareVersions("1.0.83", "1.0.83")).toBe(0);
    expect(compareVersions("1.0.9", "1.0.10")).toBe(-1);
  });
});
