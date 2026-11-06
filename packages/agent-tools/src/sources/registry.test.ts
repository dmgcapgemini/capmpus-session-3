import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRIEF, makeSourcesDir } from "../testing.ts";
import { loadSourceRegistry, MAX_SOURCE_BYTES, SourceManifestError } from "./registry.ts";

const entry = (overrides: Record<string, unknown> = {}) => ({
  id: "solution-brief",
  name: "Solution brief",
  file: "brief.md",
  mediaType: "text/markdown",
  ...overrides,
});

describe("source registry", () => {
  it("lists declared sources with their size and without paths", async () => {
    const registry = await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF }));
    expect(registry.list()).toEqual([
      {
        id: "solution-brief",
        name: "Solution brief",
        mediaType: "text/markdown",
        sizeBytes: Buffer.byteLength(BRIEF),
      },
    ]);
  });

  it("reads a declared source by ID", async () => {
    const registry = await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF }));
    expect((await registry.read("solution-brief"))?.content).toBe(BRIEF);
  });

  it("returns nothing for an undeclared ID", async () => {
    const registry = await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF, "other.md": "x" }));
    expect(await registry.read("other")).toBeUndefined();
    expect(await registry.read("../other.md")).toBeUndefined();
  });

  it.each([
    ["a malformed ID", [entry({ id: "Solution Brief" })], /ID must match/],
    ["a duplicate ID", [entry(), entry({ name: "Again" })], /duplicate ID/],
    ["an absolute file", [entry({ file: "/etc/passwd" })], /must be relative/],
    ["a missing file", [entry({ file: "missing.md" })], /file not found/],
    ["a file outside the directory", [entry({ file: "../outside.md" })], /(outside|not found)/],
    ["an unsupported media type", [entry({ mediaType: "application/pdf" })], /Invalid sources.json/],
  ])("rejects %s", async (_label, sources, message) => {
    const dir = await makeSourcesDir({ "brief.md": BRIEF }, sources);
    await expect(loadSourceRegistry(dir)).rejects.toThrow(message);
  });

  it("rejects a symbolic link that points outside the directory", async () => {
    const outside = await makeSourcesDir({ "secret.md": "secret" }, []);
    const dir = await makeSourcesDir({}, [entry({ file: "link/secret.md" })]);
    // Windows junctions exercise realpath containment without symlink privileges.
    await symlink(outside, join(dir, "link"), process.platform === "win32" ? "junction" : "dir");
    await expect(loadSourceRegistry(dir)).rejects.toThrow(/outside the sources directory/);
  });

  it("rejects a directory and an oversized file", async () => {
    const withDir = await makeSourcesDir({}, [entry({ file: "sub" })]);
    await mkdir(join(withDir, "sub"));
    await expect(loadSourceRegistry(withDir)).rejects.toThrow(/not a regular file/);

    const big = await makeSourcesDir({}, [entry({ file: "big.md" })]);
    await writeFile(join(big, "big.md"), "x".repeat(MAX_SOURCE_BYTES + 1));
    await expect(loadSourceRegistry(big)).rejects.toThrow(/larger than/);
  });

  it("reports a missing directory or manifest as a manifest error", async () => {
    await expect(loadSourceRegistry("/nonexistent/loom-sources")).rejects.toBeInstanceOf(SourceManifestError);
    const empty = await makeSourcesDir({});
    await writeFile(join(empty, "sources.json"), "{ not json");
    await expect(loadSourceRegistry(empty)).rejects.toBeInstanceOf(SourceManifestError);
  });
});
