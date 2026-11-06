import { createKnowledgeTools, KNOWLEDGE_INSTRUCTIONS, type KnowledgeRegistry } from "@loom/agent-tools";
import { ApiError, KnowledgeQueryDetail, StartRunRequest, StartRunResponse } from "@loom/contracts";
import {
  appendRetrieval,
  createKnowledgeQuery,
  getKnowledgeQuery,
  getRun,
  type LoomDatabase,
  listKnowledgeQueries,
  saveKnowledgeAnswer,
} from "@loom/persistence";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { RunError, type RunService } from "../runs/service.ts";
export async function knowledgeRoutes(
  app: FastifyInstance,
  options: { db: LoomDatabase; runs: RunService; registry: KnowledgeRegistry },
) {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const { db, runs, registry } = options;
  api.setErrorHandler((error, request, reply) => {
    if (error instanceof RunError) return reply.code(error.statusCode).send({ error: error.message });
    if (error && typeof error === "object" && "validation" in error)
      return reply.code(400).send({ error: "Invalid request" });
    request.log.error(error);
    return reply.code(500).send({ error: "Internal error; see API log" });
  });
  api.get("/knowledge", async () => ({
    queries: (await listKnowledgeQueries(db)).map((r) => ({
      id: r.id,
      task: r.task,
      status: r.status,
      startedAt: r.started_at.toISOString(),
    })),
  }));
  api.get(
    "/knowledge/:id",
    {
      schema: { params: z.object({ id: z.uuid() }), response: { 200: KnowledgeQueryDetail, 404: ApiError } },
    },
    async (request) => {
      const query = await getKnowledgeQuery(db, request.params.id);
      const run = await getRun(db, request.params.id);
      if (!query || !run) throw new RunError(404, "Knowledge question not found");
      return { run, reports: query.reports, answer: query.answer };
    },
  );
  api.post(
    "/knowledge",
    {
      schema: {
        body: StartRunRequest.required({ task: true }),
        response: { 202: StartRunResponse, 400: ApiError, 409: ApiError, 500: ApiError, 503: ApiError },
      },
    },
    async (request, reply) => {
      const runId = await runs.start(request.body.task, {
        instructions: KNOWLEDGE_INSTRUCTIONS,
        onCreated: (id) => createKnowledgeQuery(db, id),
        createCapability: (id) =>
          createKnowledgeTools({
            registry,
            now: () => new Date(),
            report: (report) => appendRetrieval(db, id, report),
            save: (answer) => saveKnowledgeAnswer(db, id, answer),
            log: (message, cause) => app.log.error({ err: cause }, message),
          }),
      });
      return reply.code(202).send({ runId });
    },
  );
}
