import {
  ApiError,
  CreateWorkflowRequest,
  ReviewWorkflowRequest,
  Workflow,
  WorkflowDetail,
  WorkflowList,
} from "@loom/contracts";
import { listWorkflows, reviewWorkflow, WorkflowError, workflowDetail } from "@loom/persistence";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import type { WorkflowService } from "./service.ts";

export async function workflowRoutes(app: FastifyInstance, { service }: { service: WorkflowService }) {
  const api = app.withTypeProvider<ZodTypeProvider>();
  const params = z.object({ id: z.uuid() });
  const errors = { 400: ApiError, 404: ApiError, 409: ApiError, 500: ApiError };
  api.setErrorHandler((error, request, reply) => {
    if (error instanceof WorkflowError) return reply.code(error.statusCode).send({ error: error.message });
    if (error && typeof error === "object" && "validation" in error)
      return reply.code(400).send({ error: "Invalid request" });
    request.log.error(error);
    return reply.code(500).send({ error: "Internal error; see the API log" });
  });
  api.get("/workflows", { schema: { response: { 200: WorkflowList } } }, async () => ({
    workflows: await listWorkflows(service.db),
  }));
  api.post(
    "/workflows",
    { schema: { body: CreateWorkflowRequest, response: { 202: Workflow, ...errors } } },
    async (request, reply) =>
      reply.code(202).send(await service.create(request.body.task, request.body.maxAttempts)),
  );
  api.get(
    "/workflows/:id",
    { schema: { params, response: { 200: WorkflowDetail, ...errors } } },
    async (request) => workflowDetail(service.db, request.params.id),
  );
  for (const [action, decision] of [
    ["accept", "ACCEPTED"],
    ["reject", "REJECTED"],
  ] as const) {
    api.post(
      `/workflows/:id/${action}`,
      {
        schema: { params, body: ReviewWorkflowRequest, response: { 200: Workflow, ...errors } },
      },
      async (request) =>
        reviewWorkflow(service.db, request.params.id, request.body.version, decision, request.body.reason),
    );
  }
}
