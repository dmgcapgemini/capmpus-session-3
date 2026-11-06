import { randomUUID } from "node:crypto";
import { ScriptedAgentRunner, type ScriptStep } from "@loom/agent-runtime/testing";
import { loadSourceRegistry } from "@loom/agent-tools";
import { BRIEF, makeSourcesDir, validAnalysis } from "@loom/agent-tools/testing";
import { loadConfig } from "@loom/config";
import { RunDetail, RunEvent } from "@loom/contracts";
import { createRun } from "@loom/persistence";
import { openTestDatabase, truncateAll } from "@loom/persistence/testing";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../server.ts";

let app: FastifyInstance;
const success: ScriptStep[] = [
  { tool: "list_sources", args: {} },
  { tool: "read_source", args: { sourceId: "solution-brief" } },
  { tool: "submit_analysis_result", args: validAnalysis() },
];
async function setup(script: ScriptStep[]) {
  app = await buildServer({
    config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
    db: openTestDatabase(),
    runner: new ScriptedAgentRunner(script),
    registry: await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF })),
  });
  return app;
}
beforeEach(async () => {
  const db = openTestDatabase();
  try {
    await truncateAll(db);
  } finally {
    await db.destroy();
  }
});
afterEach(async () => {
  await app?.close();
});
async function start() {
  const response = await app.inject({ method: "POST", url: "/api/agent-runs", payload: {} });
  expect(response.statusCode).toBe(202);
  return response.json<{ runId: string }>().runId;
}
async function finished(id: string) {
  await expect
    .poll(async () => (await app.inject(`/api/agent-runs/${id}`)).json().run.status)
    .not.toBe("running");
  return RunDetail.parse((await app.inject(`/api/agent-runs/${id}`)).json());
}
function events(body: string) {
  return body
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => RunEvent.parse(JSON.parse(line.slice(6))) as RunEvent);
}

describe("Session 1 run API", () => {
  it("workshop session-01: completes a run with validated persisted output and replayable events", async () => {
    await setup(success);
    const id = await start();
    const detail = await finished(id);
    expect(detail.run).toMatchObject({
      status: "completed",
      toolCalls: 3,
      deniedToolCalls: 0,
      modelCalls: 3,
    });
    expect(detail.result?.result).toEqual(validAnalysis());
    const stream = await app.inject(`/api/agent-runs/${id}/events`);
    expect(stream.headers["content-type"]).toContain("text/event-stream");
    const all = events(stream.body);
    expect(all.at(-1)?.type).toBe("run.finished");
    expect(all.map((event) => event.seq)).toEqual(all.map((_, i) => i + 1));
    const replay = await app.inject({
      url: `/api/agent-runs/${id}/events`,
      headers: { "last-event-id": "3" },
    });
    expect(events(replay.body)).toEqual(all.filter((event) => event.seq > 3));
    const ended = await app.inject({
      url: `/api/agent-runs/${id}/events`,
      headers: { "last-event-id": String(all.at(-1)?.seq) },
    });
    expect(ended.body).toBe("");
  });
  it("records incomplete and failed runs without inventing a result", async () => {
    await setup([{ say: "I have no analysis." }]);
    expect(await finished(await start())).toMatchObject({ run: { status: "incomplete" }, result: null });
    await app.close();
    await setup([{ fail: "Provider unavailable" }]);
    expect(await finished(await start())).toMatchObject({
      run: { status: "failed", error: "Provider unavailable" },
      result: null,
    });
  });
  it.each(["timeout", "error", "stopped", "idle"] as const)(
    "persists %s diagnostics and partial model output",
    async (kind) => {
      app = await buildServer({
        config: { ...loadConfig(), api: { port: 0, logLevel: "silent" } },
        db: openTestDatabase(),
        registry: await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF })),
        runner: {
          profile: "workshop",
          runtime: "test",
          model: "test",
          close: async () => {},
          start(input) {
            input.onEvent({ type: "assistant.delta", messageId: "partial", text: "Unfinished " });
            input.onEvent({ type: "assistant.delta", messageId: "partial", text: "response" });
            input.onEvent({ type: "run.recovery", attempt: 1 });
            if (kind === "idle") {
              input.onEvent({
                type: "tool.requested",
                toolCallId: "sdk-rejected",
                toolName: "submit_analysis_result",
                arguments: {},
              });
              input.onEvent({
                type: "tool.completed",
                toolCallId: "sdk-rejected",
                toolName: "submit_analysis_result",
                success: false,
                summary: "SDK rejected the arguments before calling the handler",
              });
            }
            return {
              done: Promise.resolve({
                kind,
                sessionId: "test-session",
                error: kind === "stopped" ? undefined : "Test failure",
              }),
              stop: async () => {},
            };
          },
        },
      });
      const detail = await finished(await start());
      expect(detail.run.diagnostics).toMatchObject({
        termination: kind === "error" ? "runtime_error" : kind === "idle" ? "tool_error" : kind,
        recoveries: 1,
        submissionAttempts: kind === "idle" ? 1 : 0,
        assistantMessages: [{ id: "partial", content: "Unfinished response", partial: true }],
      });
      expect(detail.result).toBeNull();
    },
  );
  it("bounds retained model text and marks truncation explicitly", async () => {
    await setup([{ say: "x".repeat(16001) }]);
    const detail = await finished(await start());
    expect(detail.run.diagnostics?.truncated).toBe(true);
    expect(detail.run.diagnostics?.assistantMessages[0]?.content).toHaveLength(16000);
  });
  it("records policy and permission denials", async () => {
    await setup([{ tool: "submit_analysis_result", args: validAnalysis() }, { permission: "shell" }]);
    const id = await start();
    const detail = await finished(id);
    expect(detail.run.deniedToolCalls).toBe(2);
    expect(detail.run.diagnostics).toMatchObject({ termination: "submission_denied", submissionAttempts: 1 });
    expect(
      events((await app.inject(`/api/agent-runs/${id}/events`)).body).filter(
        (event) => event.type === "tool.denied",
      ),
    ).toHaveLength(2);
  });
  it("reserves the active run before concurrent requests and stops it", async () => {
    await setup([{ waitForStop: true }]);
    const replies = await Promise.all([
      app.inject({ method: "POST", url: "/api/agent-runs", payload: {} }),
      app.inject({ method: "POST", url: "/api/agent-runs", payload: {} }),
    ]);
    expect(replies.map((reply) => reply.statusCode).sort()).toEqual([202, 409]);
    const id = replies.find((reply) => reply.statusCode === 202)?.json().runId;
    expect((await app.inject({ method: "POST", url: `/api/agent-runs/${id}/stop` })).statusCode).toBe(202);
    expect((await finished(id)).run.status).toBe("stopped");
    expect((await app.inject({ method: "POST", url: `/api/agent-runs/${id}/stop` })).statusCode).toBe(409);
  });
  it("rejects malformed requests and reports unknown runs", async () => {
    await setup([]);
    expect(
      (await app.inject({ method: "POST", url: "/api/agent-runs", payload: { task: " " } })).statusCode,
    ).toBe(400);
    expect((await app.inject("/api/agent-runs/not-a-uuid")).statusCode).toBe(400);
    const id = randomUUID();
    for (const path of [`/api/agent-runs/${id}`, `/api/agent-runs/${id}/events`])
      expect((await app.inject(path)).statusCode).toBe(404);
    expect((await app.inject({ method: "POST", url: `/api/agent-runs/${id}/stop` })).statusCode).toBe(404);
    const runId = await start();
    await finished(runId);
    expect(
      (await app.inject({ url: `/api/agent-runs/${runId}/events`, headers: { "last-event-id": "bad" } }))
        .statusCode,
    ).toBe(400);
  });
  it("marks interrupted runs failed and makes trace loss explicit", async () => {
    const db = openTestDatabase();
    const id = randomUUID();
    await createRun(db, { id, task: "Interrupted", clientProfile: "workshop", model: null });
    await db.destroy();
    await setup([]);
    expect((await finished(id)).run).toMatchObject({
      status: "failed",
      error: "interrupted: the API restarted",
    });
    expect((await app.inject(`/api/agent-runs/${id}/events`)).statusCode).toBe(410);
  });
  it("lists sources without paths and exposes the agent profile", async () => {
    await setup([]);
    expect((await app.inject("/api/sources")).json().sources[0]).toEqual({
      id: "solution-brief",
      name: "Solution brief",
      mediaType: "text/markdown",
      sizeBytes: Buffer.byteLength(BRIEF),
    });
    expect((await app.inject("/api/agent/profile")).json().toolNames).toEqual([
      "list_sources",
      "read_source",
      "submit_analysis_result",
    ]);
  });
  it("replays a completed trace larger than the socket buffer without losing the terminal event", async () => {
    const messages = Array.from({ length: 120 }, (_, i) => ({ say: `${i}: ${"x".repeat(4096)}` }));
    await setup(messages);
    const url = await app.listen({ host: "127.0.0.1", port: 0 });
    const id = await start();
    await finished(id);
    const response = await fetch(`${url}/api/agent-runs/${id}/events`);
    const all = events(await response.text());
    expect(all.filter((event) => event.type === "assistant.message").map((event) => event.content)).toEqual(
      messages.map((step) => step.say),
    );
    expect(all.at(-1)?.type).toBe("run.finished");
    expect(all.map((event) => event.seq)).toEqual(all.map((_, i) => i + 1));
  });
  it("streams new events over a real HTTP connection and closes after stop", async () => {
    await setup([{ waitForStop: true }]);
    const url = await app.listen({ host: "127.0.0.1", port: 0 });
    const id = await start();
    const response = await fetch(`${url}/api/agent-runs/${id}/events`);
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();
    const first = await reader?.read();
    expect(new TextDecoder().decode(first?.value)).toContain("run.started");
    await app.inject({ method: "POST", url: `/api/agent-runs/${id}/stop` });
    let remaining = "";
    while (reader) {
      const chunk = await reader.read();
      if (chunk.done) break;
      remaining += new TextDecoder().decode(chunk.value);
    }
    expect(remaining).toContain('"status":"stopped"');
  });
});
