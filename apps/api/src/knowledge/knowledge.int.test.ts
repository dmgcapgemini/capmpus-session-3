import { resolve } from "node:path";
import { createKnowledgeTools } from "@loom/agent-tools";
import { callTool } from "@loom/agent-tools/testing";
import { seedKnowledge } from "@loom/persistence";
import { openTestDatabase, truncateAll } from "@loom/persistence/testing";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createKnowledgeRegistry, validateFmsUrl } from "./adapters.ts";
import { buildFmsMock, type MockOptions } from "./mock.ts";

const db = openTestDatabase();
const now = new Date("2026-09-15T10:00:00.000Z");
const root = resolve(import.meta.dirname, "../../../..");
let mock: ReturnType<typeof buildFmsMock> | undefined;
let options: MockOptions;
const registry = async () => {
  options = { mode: "normal", delayMs: 0, ageSeconds: 0 };
  mock = buildFmsMock([{ vehicleId: "FT-V-001", status: "available", temperatureC: 5 }], options, () => now);
  const url = await mock.listen({ host: "127.0.0.1", port: 0 });
  return createKnowledgeRegistry(db, url, () => now, 100);
};
beforeEach(async () => {
  await truncateAll(db);
  await seedKnowledge(db, resolve(root, "examples/session-03"), now);
});
afterEach(async () => {
  await mock?.close();
  mock = undefined;
});
afterAll(() => db.destroy());
describe("knowledge adapters", () => {
  it("indexes Markdown with full-text ranking and parameterized queries", async () => {
    const r = await registry();
    const rows = await r.get("documents").retrieve({ query: "route acknowledgement" });
    expect(rows.map((x) => x.sourceId).sort()).toEqual(["dispatcher-interview", "operations-manual"]);
    expect(rows[0]).toMatchObject({ method: "documents", retrievedAt: now.toISOString() });
    expect(await r.get("documents").retrieve({ query: "' ; DROP TABLE knowledge_documents; --" })).toEqual(
      [],
    );
    expect((await r.get("documents").retrieve({ query: "route" })).length).toBeGreaterThan(0);
  });
  it.each(["LOC-SM1 old export", "LOC-SM1 export historical", "old export delivery window", "old export"])(
    "workshop session-03: finds and rejects the stale export for the natural keyword query %s",
    async (query) => {
      const r = await registry();
      const rows = await r.get("documents").retrieve({ query });
      expect(rows.map((row) => row.sourceId)).toContain("export-2023");
      const capability = createKnowledgeTools({
        registry: r,
        now: () => now,
        report: async () => {},
        save: async () => {},
        log: () => {},
      });
      const search = capability.tools.find((tool) => tool.name === "search_documents");
      if (!search) throw new Error("Missing document search");
      const result = await callTool(search, { query });
      expect(result).toMatchObject({
        rejected: expect.arrayContaining([
          { sourceId: "export-2023", evidenceRef: "doc:export-2023", reason: "Source observation is stale" },
        ]),
      });
      expect(JSON.stringify(result)).not.toContain("This 2023 snapshot");
    },
  );
  it("excludes incidental keyword matches from fallback results", async () => {
    const r = await registry();
    const rows = await r.get("documents").retrieve({ query: "operations manual route change procedure" });
    expect(rows.map((row) => row.sourceId).sort()).toEqual(["dispatcher-interview", "operations-manual"]);
    expect(rows.map((row) => row.sourceId)).not.toContain("driver-chat");
  });
  it("preserves exact matches, quoted phrases, exclusions and explicit operators", async () => {
    const r = await registry();
    const ids = async (query: string) =>
      (await r.get("documents").retrieve({ query })).map((row) => row.sourceId);
    expect(await ids("customer agreement")).toEqual(["customer-agreement"]);
    expect(await ids('"old export"')).toEqual([]);
    expect(await ids("export -2023")).toEqual([]);
    expect(await ids("nonexistent OR astronomical")).toEqual([]);
    expect(await ids("nonexistent AND export")).toEqual([]);
    expect(await ids("nonexistent NOT export")).toEqual([]);
    expect(await ids("nonexistent astronomical")).toEqual([]);
    expect(await ids("the and of")).toEqual([]);
  });
  it("ranks fallback candidates and keeps the six-document bound", async () => {
    const r = await registry();
    const documents = Array.from({ length: 8 }, (_, i) => ({
      id: `fallback-${i}`,
      content: `orchard cultivar ${i}`,
      authority: "authoritative" as const,
      observed_at: now,
      facts: "[]",
    }));
    await db.insertInto("knowledge_documents").values(documents).execute();
    const rows = await r.get("documents").retrieve({ query: "orchard cultivar nonexistent" });
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.sourceId)).toEqual(documents.slice(0, 6).map((row) => row.id));
    const ranked = await r.get("documents").retrieve({ query: "old export delivery window" });
    expect(ranked[0]?.sourceId).toBe("export-2023");
  });
  it("workshop session-03: retrieves joined driver, customer and vehicle records", async () => {
    const r = await registry();
    expect((await r.get("records").retrieve({ entity: "driver", id: "D-101" }))[0]?.content).toContain("C1");
    expect((await r.get("records").retrieve({ entity: "location", id: "LOC-SM1" }))[0]?.content).toContain(
      "Supermarket customer 1",
    );
    expect((await r.get("records").retrieve({ entity: "vehicle", id: "FT-V-001" }))[0]?.content).toContain(
      "8000",
    );
  });
  it("rejects path/SQL input and unknown exact IDs", async () => {
    const r = await registry();
    await expect(r.get("records").retrieve({ entity: "driver", id: "../etc/passwd" })).rejects.toThrow();
    expect(await r.get("records").retrieve({ entity: "driver", id: "D-999" })).toEqual([]);
    expect(() => validateFmsUrl("https://example.org")).toThrow();
    expect(() => validateFmsUrl("http://127.0.0.1:3010/secret")).toThrow();
  });
  it("retrieves FMS data over HTTP and bounds failures and timeouts", async () => {
    const r = await registry();
    expect((await r.get("fms").retrieve({ vehicleId: "FT-V-001" }))[0]).toMatchObject({
      sourceId: "fms",
      authority: "authoritative",
      method: "fms",
    });
    options.mode = "failure";
    await expect(r.get("fms").retrieve({ vehicleId: "FT-V-001" })).rejects.toThrow();
    options.mode = "normal";
    options.delayMs = 200;
    await expect(r.get("fms").retrieve({ vehicleId: "FT-V-001" })).rejects.toThrow();
  });
  it("workshop session-03: rejects stale FMS observations through the registered tool", async () => {
    const r = await registry();
    options.mode = "stale";
    const tools = createKnowledgeTools({
      registry: r,
      now: () => now,
      report: async () => {},
      save: async () => {},
      log: () => {},
    });
    const t = tools.tools.find((t) => t.name === "get_vehicle_status");
    expect(t).toBeDefined();
    const result = await callTool(t as NonNullable<typeof t>, { vehicleId: "FT-V-001" });
    expect(result).toMatchObject({
      items: [],
      rejected: [{ sourceId: "fms", reason: "Source observation is stale" }],
    });
  });
  it("seeds repeatedly without duplicating relational rows", async () => {
    await seedKnowledge(db, resolve(root, "examples/session-03"), now);
    expect(await db.selectFrom("knowledge_drivers").selectAll().execute()).toHaveLength(3);
    expect(await db.selectFrom("knowledge_documents").selectAll().execute()).toHaveLength(6);
  });
  it("keeps phrase positions and exclusions local to an OR branch", async () => {
    const r = await registry();
    await db
      .insertInto("knowledge_documents")
      .values([
        {
          id: "syntax-a",
          content: "orchard cultivar",
          authority: "authoritative",
          observed_at: now,
          facts: "[]",
        },
        {
          id: "syntax-b",
          content: "orchard blight cultivar",
          authority: "authoritative",
          observed_at: now,
          facts: "[]",
        },
        {
          id: "syntax-c",
          content: "citrus blight",
          authority: "authoritative",
          observed_at: now,
          facts: "[]",
        },
      ])
      .execute();
    const ids = async (query: string) =>
      (await r.get("documents").retrieve({ query })).map((row) => row.sourceId).sort();
    expect(await ids('"orchard cultivar"')).toEqual(["syntax-a"]);
    expect(await ids("orchard -blight OR citrus")).toEqual(["syntax-a", "syntax-c"]);
  });
  it("counts repeated English inflections once in strongest-overlap fallback", async () => {
    const r = await registry();
    await db
      .insertInto("knowledge_documents")
      .values([
        { id: "lexeme-a", content: "orchard", authority: "authoritative", observed_at: now, facts: "[]" },
        { id: "lexeme-b", content: "cultivar", authority: "authoritative", observed_at: now, facts: "[]" },
      ])
      .execute();
    const rows = await r.get("documents").retrieve({ query: "orchard orchards cultivar absent" });
    expect(rows.map((row) => row.sourceId).sort()).toEqual(["lexeme-a", "lexeme-b"]);
  });
  it("keeps indexed content synchronized across updates, deletes and reseeding", async () => {
    const r = await registry();
    await db
      .updateTable("knowledge_documents")
      .set({ content: "Unique orchard cultivar." })
      .where("id", "=", "operations-manual")
      .execute();
    expect(
      (await r.get("documents").retrieve({ query: "orchard cultivar" })).map((row) => row.sourceId),
    ).toEqual(["operations-manual"]);
    await db.deleteFrom("knowledge_documents").where("id", "=", "operations-manual").execute();
    expect(await r.get("documents").retrieve({ query: "orchard cultivar" })).toEqual([]);
    await seedKnowledge(db, resolve(root, "examples/session-03"), now);
    await seedKnowledge(db, resolve(root, "examples/session-03"), now);
    expect(await r.get("documents").retrieve({ query: "orchard cultivar" })).toEqual([]);
    expect(
      (await r.get("documents").retrieve({ query: "route acknowledgement" }))
        .map((row) => row.sourceId)
        .sort(),
    ).toEqual(["dispatcher-interview", "operations-manual"]);
  });
});
