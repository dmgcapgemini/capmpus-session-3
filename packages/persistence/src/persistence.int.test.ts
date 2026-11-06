import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { checkDatabase } from "./health.ts";
import { migrateToLatest, migrationStatus } from "./migrate.ts";
import { declaredColumns } from "./schema.ts";
import { seed } from "./seed.ts";
import { openTestDatabase, truncateAll } from "./testing.ts";

const db = openTestDatabase();

afterAll(() => db.destroy());
beforeEach(() => truncateAll(db));

describe("persistence", () => {
  it("has applied every migration", async () => {
    expect(await migrateToLatest(db)).toEqual({ applied: [] });
    const status = await migrationStatus(db);
    expect(status.every((m) => m.executedAt instanceof Date)).toBe(true);
  });

  it("matches the hand-written schema types", async () => {
    const tables = await db.introspection.getTables();
    const actual = Object.fromEntries(
      tables
        .filter(
          (table) =>
            !table.name.startsWith("loom_migration") && !table.name.startsWith("knowledge_documents_fts"),
        )
        .map((table) => [table.name, table.columns.map((column) => column.name)]),
    );
    expect(actual).toEqual(declaredColumns);
  });

  it("seeds idempotently", async () => {
    await seed(db);
    await seed(db);
    const rows = await db.selectFrom("loom_meta").select(["key", "value"]).orderBy("key").execute();
    expect(rows).toContainEqual({ key: "workspace.name", value: "FruitTrucks" });
    expect(rows).toHaveLength(2);
  });

  it("reports health with the schema version", async () => {
    const health = await checkDatabase(db);
    expect(health).toMatchObject({ reachable: true, schemaVersion: "s03-0002-run-diagnostics" });
  });
});
