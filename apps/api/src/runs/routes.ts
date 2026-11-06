import {
  AgentProfile,
  ApiError,
  ListSourcesResult,
  RunDetail,
  RunList,
  StartRunRequest,
  StartRunResponse,
} from "@loom/contracts";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { RunError, type RunService } from "./service.ts";

const params = z.object({ id: z.uuid() });
const errors = { 400: ApiError, 404: ApiError, 409: ApiError, 410: ApiError, 500: ApiError, 503: ApiError };

export async function runRoutes(app: FastifyInstance, options: { service: RunService }) {
  const service = options.service;
  const api = app.withTypeProvider<ZodTypeProvider>();
  api.setErrorHandler((error, request, reply) => {
    if (error instanceof RunError) return reply.code(error.statusCode).send({ error: error.message });
    if (error && typeof error === "object" && "validation" in error)
      return reply.code(400).send({ error: "Invalid request" });
    request.log.error(error);
    return reply.code(500).send({ error: "Internal error; see the API log" });
  });
  api.get("/sources", { schema: { response: { 200: ListSourcesResult } } }, async () => ({
    sources: service.registry.list(),
  }));
  api.get("/agent/profile", { schema: { response: { 200: AgentProfile } } }, async () => service.profile());
  api.get("/agent-runs", { schema: { response: { 200: RunList } } }, async () => ({
    runs: await service.list(),
  }));
  api.post(
    "/agent-runs",
    { schema: { body: StartRunRequest, response: { 202: StartRunResponse, ...errors } } },
    async (request, reply) => reply.code(202).send({ runId: await service.start(request.body.task) }),
  );
  api.get(
    "/agent-runs/:id",
    { schema: { params, response: { 200: RunDetail, ...errors } } },
    async (request) => service.detail(request.params.id),
  );
  api.post(
    "/agent-runs/:id/stop",
    { schema: { params, response: { 202: StartRunResponse, ...errors } } },
    async (request, reply) => {
      await service.stop(request.params.id);
      return reply.code(202).send({ runId: request.params.id });
    },
  );
  api.get("/agent-runs/:id/events", { schema: { params } }, async (request, reply) => {
    const id = request.params.id;
    await service.detail(id);
    const buffer = service.hub.get(id);
    if (!buffer)
      throw new RunError(410, "Trace is no longer in memory. The stored result remains available.");
    const header = request.headers["last-event-id"] ?? "0";
    if (typeof header !== "string" || !/^\d+$/.test(header) || !Number.isSafeInteger(Number(header)))
      throw new RunError(400, "Invalid Last-Event-ID");
    const after = Number(header);
    if (after > buffer.seq) throw new RunError(400, "Last-Event-ID is ahead of this run");
    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    let cursor = after;
    let waitingForDrain = false;
    const cleanup = () => {
      clearInterval(heartbeat);
      buffer.listeners.delete(pump);
      raw.off("drain", drain);
    };
    const pump = () => {
      if (raw.destroyed || raw.writableEnded) return cleanup();
      if (waitingForDrain) return;
      const earliest = buffer.events[0]?.seq ?? 1;
      if (cursor < earliest - 1) {
        cursor = earliest - 1;
        if (
          !raw.write(
            'event: trace-gap\ndata: {"message":"Earlier trace events have expired from memory"}\n\n',
          )
        ) {
          waitingForDrain = true;
          return;
        }
      }
      // Resume from the bounded hub after drain; never copy the trace into an unbounded response queue.
      for (const event of buffer.events) {
        if (event.seq <= cursor) continue;
        cursor = event.seq;
        waitingForDrain = !raw.write(`id: ${event.seq}\ndata: ${JSON.stringify(event)}\n\n`);
        if (event.type === "run.finished") {
          cleanup();
          raw.end();
          return;
        }
        if (waitingForDrain) return;
      }
      if (buffer.finished && cursor >= buffer.seq) {
        cleanup();
        raw.end();
      }
    };
    const drain = () => {
      waitingForDrain = false;
      pump();
    };
    const heartbeat = setInterval(() => {
      if (!raw.destroyed && !raw.writableEnded && !waitingForDrain)
        waitingForDrain = !raw.write(": heartbeat\n\n");
    }, 15_000);
    raw.on("close", cleanup);
    raw.on("drain", drain);
    buffer.listeners.add(pump);
    pump();
  });
}
