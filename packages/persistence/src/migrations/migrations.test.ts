import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migrations } from "./index.ts";

describe("migration registry", () => {
  const files = readdirSync(import.meta.dirname)
    .filter((file) => /^s\d{2}-\d{4}-.+\.ts$/.test(file))
    .map((file) => file.replace(/\.ts$/, ""));

  it("registers every migration file", () => {
    expect(Object.keys(migrations).sort()).toEqual(files.sort());
  });

  it("uses session-ordered names", () => {
    for (const name of Object.keys(migrations)) {
      expect(name).toMatch(/^s\d{2}-\d{4}-[a-z0-9-]+$/);
    }
  });
});
