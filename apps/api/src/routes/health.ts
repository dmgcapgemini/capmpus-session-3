import { HealthResponse } from "@loom/contracts";
import { checkDatabase, type LoomDatabase } from "@loom/persistence";
import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import pkg from "../../package.json" with { type: "json" };

export const healthRoutes: FastifyPluginAsync<{ db: LoomDatabase }> = async (app, { db }) => {
  app
    .withTypeProvider<ZodTypeProvider>()
    .get("/health", { schema: { response: { 200: HealthResponse } } }, async () => {
      const health = await checkDatabase(db);
      const schemaVersion = health.reachable ? health.schemaVersion : null;
      return {
        status: health.reachable && schemaVersion !== null ? "ok" : "degraded",
        version: pkg.version,
        database: { reachable: health.reachable, schemaVersion },
      } as const;
    });
};
