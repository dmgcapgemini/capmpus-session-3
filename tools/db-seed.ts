import { resolve } from "node:path";
import { loadConfig } from "@loom/config";
import { createDatabase, seed, seedKnowledge } from "@loom/persistence";

const config = loadConfig();
const db = createDatabase(config.databaseUrl, { maxConnections: 1 });

try {
  const { upserted } = await seed(db);
  console.log(`✓ seeded ${upserted} rows`);
  console.log(await seedKnowledge(db, resolve(import.meta.dirname, "../examples/session-03")));
} finally {
  await db.destroy();
}
