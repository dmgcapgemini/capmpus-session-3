import { describe, expect, it } from "vitest";
import { createAnalysisTools, SESSION_01_TOOL_NAMES } from "../index.ts";
import { BRIEF, callTool, MemoryResultStore, makeToolContext, validAnalysis } from "../testing.ts";
import type { ToolContext } from "./context.ts";

const toolsFor = (ctx: ToolContext) => {
  const [listSources, readSource, submitAnalysis] = createAnalysisTools(ctx);
  if (!listSources || !readSource || !submitAnalysis) throw new Error("missing tools");
  return { listSources, readSource, submitAnalysis };
};

const failureText = (result: unknown) => {
  expect(result).toMatchObject({ resultType: "failure" });
  return (result as { textResultForLlm: string }).textResultForLlm;
};

describe("tool set", () => {
  it("exposes exactly the Session 1 tools", async () => {
    const tools = createAnalysisTools(await makeToolContext());
    expect(tools.map((t) => t.name)).toEqual([...SESSION_01_TOOL_NAMES]);
  });
});

describe("list_sources", () => {
  it("lists only declared sources and changes nothing", async () => {
    const ctx = await makeToolContext();
    const result = await callTool(toolsFor(ctx).listSources, {});
    expect(result).toEqual({
      sources: [
        {
          id: "solution-brief",
          name: "Solution brief",
          mediaType: "text/markdown",
          sizeBytes: expect.any(Number),
        },
      ],
    });
    expect(ctx.state.readSourceIds.size).toBe(0);
  });
});

describe("workshop session-01: read_source boundary", () => {
  it("returns a declared source and records the read", async () => {
    const ctx = await makeToolContext();
    const result = await callTool(toolsFor(ctx).readSource, { sourceId: "solution-brief" });
    expect(result).toMatchObject({ sourceId: "solution-brief", content: BRIEF });
    expect([...ctx.state.readSourceIds]).toEqual(["solution-brief"]);
  });

  it("rejects an unknown source ID", async () => {
    const ctx = await makeToolContext();
    const text = failureText(await callTool(toolsFor(ctx).readSource, { sourceId: "salaries" }));
    expect(text).toMatch(/Unknown sourceId "salaries".*list_sources/);
    expect(ctx.state.readSourceIds.size).toBe(0);
  });

  it.each(["../../.env", "/etc/passwd", "..\\secrets", "sub/brief"])(
    "rejects the path %s",
    async (sourceId) => {
      const ctx = await makeToolContext();
      expect(failureText(await callTool(toolsFor(ctx).readSource, { sourceId }))).toMatch(/not a path/);
    },
  );

  it("rejects an invalid argument", async () => {
    const ctx = await makeToolContext();
    expect(failureText(await callTool(toolsFor(ctx).readSource, { id: 42 }))).toMatch(/Invalid arguments/);
  });
});

describe("submit_analysis_result validation", () => {
  it("rejects a schema violation and stores nothing", async () => {
    const results = new MemoryResultStore();
    const ctx = await makeToolContext({ results });
    const text = failureText(
      await callTool(toolsFor(ctx).submitAnalysis, { ...validAnalysis(), evidence: [] }),
    );
    expect(text).toMatch(/does not match the contract/);
    expect(results.saved).toHaveLength(0);
  });

  it("rejects evidence from a source that was not read", async () => {
    const ctx = await makeToolContext();
    expect(failureText(await callTool(toolsFor(ctx).submitAnalysis, validAnalysis()))).toMatch(
      /was not read/,
    );
  });

  it("rejects a quotation that is not in the source", async () => {
    const ctx = await makeToolContext();
    ctx.state.readSourceIds.add("solution-brief");
    const analysis = {
      ...validAnalysis(),
      evidence: [{ sourceId: "solution-brief", quotation: "trucks fly to Mars daily" }],
    };
    expect(failureText(await callTool(toolsFor(ctx).submitAnalysis, analysis))).toMatch(
      /quotation not found/,
    );
  });

  it("workshop session-01: converts an unexpected error into a generic failure", async () => {
    const logged: string[] = [];
    const ctx = await makeToolContext({
      results: { save: async () => Promise.reject(new Error("connection lost at 10.0.0.5")) },
      log: (message) => logged.push(message),
    });
    ctx.state.readSourceIds.add("solution-brief");
    const text = failureText(await callTool(toolsFor(ctx).submitAnalysis, validAnalysis()));
    expect(text).toBe("Internal error in submit_analysis_result; see the API log");
    expect(logged).toHaveLength(1);
  });
});

describe("workshop session-01: submit_analysis_result persistence", () => {
  it("stores a valid analysis, including a quotation that spans a line break", async () => {
    const results = new MemoryResultStore();
    const ctx = await makeToolContext({ results });
    const { readSource, submitAnalysis } = toolsFor(ctx);
    await callTool(readSource, { sourceId: "solution-brief" });
    const analysis = {
      ...validAnalysis(),
      evidence: [{ sourceId: "solution-brief", quotation: "Madrid. Today these route changes" }],
    };
    expect(await callTool(submitAnalysis, analysis)).toEqual({ accepted: true, analysisResultId: 1 });
    expect(results.saved).toEqual([{ runId: ctx.runId, result: analysis }]);
  });

  it("rejects a second submission and keeps the stored result", async () => {
    const results = new MemoryResultStore();
    const ctx = await makeToolContext({ results });
    const { readSource, submitAnalysis } = toolsFor(ctx);
    await callTool(readSource, { sourceId: "solution-brief" });
    await callTool(submitAnalysis, validAnalysis());
    expect(failureText(await callTool(submitAnalysis, validAnalysis()))).toMatch(/already accepted/);
    expect(results.saved).toHaveLength(1);
  });
});
