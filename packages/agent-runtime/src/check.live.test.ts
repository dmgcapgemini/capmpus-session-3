import { loadConfig } from "@loom/config";
import { describe, expect, it } from "vitest";
import { checkCopilot } from "./check.ts";

// Live test: needs a signed-in Copilot account. Run with `bun run test:live`.
describe("Copilot runtime (live)", () => {
  it("starts, reports a version and is authenticated", async () => {
    const result = await checkCopilot(loadConfig().copilot, { timeoutMs: 30_000 });
    expect(result.error).toBeUndefined();
    expect(result.runtimeVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(result.authenticated).toBe(true);
  }, 40_000);
});
