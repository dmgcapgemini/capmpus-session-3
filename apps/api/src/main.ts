import { ConfigError, loadConfig } from "@loom/config";
import { createDatabase } from "@loom/persistence";
import { buildServer } from "./server.ts";

let config: ReturnType<typeof loadConfig>;
try {
  config = loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    console.error(`${error.message}\nRun \`bun run preflight\` for help.`);
    process.exit(1);
  }
  throw error;
}

const app = await buildServer({ config, db: createDatabase(config.databaseUrl) });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await app.listen({ port: config.api.port, host: "127.0.0.1" });
