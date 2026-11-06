import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("executes tests in the pinned Bun runtime, including the test worker", () => {
  const required = readFileSync(resolve(import.meta.dirname, "../.bun-version"), "utf8").trim();
  expect(process.versions.bun).toBe(required);
});
