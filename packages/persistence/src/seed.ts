import type { LoomDatabase } from "./database.ts";

const WORKSPACE_META = {
  "workspace.name": "FruitTrucks",
  "workspace.description": "Fresh-produce distributor with its own refrigerated fleet",
} as const;

/** Inserts or updates reference data. Safe to run repeatedly. */
export async function seed(db: LoomDatabase): Promise<{ upserted: number }> {
  const rows = Object.entries(WORKSPACE_META).map(([key, value]) => ({ key, value }));
  await db
    .insertInto("loom_meta")
    .values(rows)
    .onConflict((oc) =>
      oc.column("key").doUpdateSet((eb) => ({ value: eb.ref("excluded.value"), updated_at: new Date() })),
    )
    .execute();
  return { upserted: rows.length };
}
