import { loadConfig, redactDatabaseUrl } from "@loom/config";
import { createDatabase, ensureDatabaseExists, migrateToLatest } from "@loom/persistence";

// Vitest global setup for integration tests: create and migrate the test database once.
export default async function setup(): Promise<void> {
  const { testDatabaseUrl } = loadConfig();
  try {
    await ensureDatabaseExists(testDatabaseUrl);
  } catch (error) {
    throw new Error(
      `Cannot reach the test database ${redactDatabaseUrl(testDatabaseUrl)}. ` +
        `For SQLite check file permissions; for PostgreSQL check podman start loom-postgres. Run \`bun run preflight\` for details.\n${String(error)}`,
    );
  }
  const db = createDatabase(testDatabaseUrl, { maxConnections: 1 });
  try {
    const { error } = await migrateToLatest(db);
    if (error) throw error;
  } finally {
    await db.destroy();
  }
}
