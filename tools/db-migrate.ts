import { loadConfig, redactDatabaseUrl } from "@loom/config";
import { createDatabase, migrateToLatest } from "@loom/persistence";

const config = loadConfig();
const db = createDatabase(config.databaseUrl, { maxConnections: 1 });

try {
  const { applied, error } = await migrateToLatest(db);
  for (const name of applied) console.log(`✓ applied ${name}`);
  if (error) {
    console.error(`✗ migration failed on ${redactDatabaseUrl(config.databaseUrl)}:`, error);
    process.exitCode = 1;
  } else if (applied.length === 0) {
    console.log("Database is up to date.");
  }
} finally {
  await db.destroy();
}
