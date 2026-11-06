import { resolve } from "node:path";
import { type AgentRunner, CopilotAgentRunner, resolveClientOptions } from "@loom/agent-runtime";
import { loadSourceRegistry, type SourceRegistry } from "@loom/agent-tools";
import type { LoomConfig } from "@loom/config";
import type { LoomDatabase } from "@loom/persistence";
import Fastify, { type FastifyInstance } from "fastify";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { createKnowledgeRegistry } from "./knowledge/adapters.ts";
import { knowledgeRoutes } from "./knowledge/routes.ts";
import { healthRoutes } from "./routes/health.ts";
import { runRoutes } from "./runs/routes.ts";
import { RunService } from "./runs/service.ts";
import { workflowRoutes } from "./workflows/routes.ts";
import { WorkflowService } from "./workflows/service.ts";

export type ServerDependencies = {
  config: LoomConfig;
  db: LoomDatabase;
  runner?: AgentRunner;
  registry?: SourceRegistry;
};

/** Builds the API without listening, so tests can use `inject`. */
export async function buildServer({
  config,
  db,
  runner,
  registry,
}: ServerDependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.api.logLevel } });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // One plugin per feature area, all under /api (ADR 0002).
  await app.register(healthRoutes, { prefix: "/api", db });

  const root = resolve(import.meta.dirname, "../../..");
  const service = new RunService(
    db,
    registry ?? (await loadSourceRegistry(resolve(root, config.sources.dir))),
    runner ??
      new CopilotAgentRunner(resolveClientOptions(config.copilot, { workspaceRoot: root }), {
        workingDirectory: resolve(root, ".loom/agent-workdir"),
        model: config.copilot.model,
      }),
    (error) => app.log.error(error),
  );
  await service.initialize();
  await app.register(runRoutes, { prefix: "/api", service });
  await app.register(knowledgeRoutes, {
    prefix: "/api",
    runs: service,
    db,
    registry: createKnowledgeRegistry(db, config.knowledge.fmsUrl),
  });
  const workflows = new WorkflowService(db, service, (error) => app.log.error(error));
  await workflows.initialize();
  await app.register(workflowRoutes, { prefix: "/api", service: workflows });
  app.addHook("onReady", async () => {
    workflows.start();
  });
  app.addHook("preClose", async () => {
    workflows.stopScheduling();
    await service.close();
    await workflows.close();
  });
  app.addHook("onClose", async () => {
    await db.destroy();
  });

  return app;
}
