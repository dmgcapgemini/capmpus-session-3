import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Tool, ToolInvocation } from "@github/copilot-sdk";
import type { SubmitAnalysisInput } from "@loom/contracts";
import { loadSourceRegistry } from "./sources/registry.ts";
import { type AnalysisResultStore, createRunToolState, type ToolContext } from "./tools/context.ts";

export const BRIEF =
  "FruitTrucks distributes fresh fruit from depots in Valencia and Madrid.\nToday these route changes are made by phone, and drivers sometimes miss them.\n";

/** A temporary sources directory with a manifest; files are written as given. */
export async function makeSourcesDir(
  files: Record<string, string>,
  sources: unknown[] = [
    { id: "solution-brief", name: "Solution brief", file: "brief.md", mediaType: "text/markdown" },
  ],
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "loom-sources-"));
  for (const [name, content] of Object.entries(files)) await writeFile(join(dir, name), content);
  await writeFile(join(dir, "sources.json"), JSON.stringify({ sources }));
  return dir;
}

export class MemoryResultStore implements AnalysisResultStore {
  readonly saved: Array<{ runId: string; result: SubmitAnalysisInput }> = [];
  async save(runId: string, result: SubmitAnalysisInput) {
    this.saved.push({ runId, result });
    return { id: this.saved.length };
  }
}

export async function makeToolContext(overrides: Partial<ToolContext> = {}): Promise<ToolContext> {
  return {
    runId: "00000000-0000-4000-8000-000000000001",
    registry: await loadSourceRegistry(await makeSourcesDir({ "brief.md": BRIEF })),
    results: new MemoryResultStore(),
    state: createRunToolState(),
    log: () => {},
    ...overrides,
  };
}

let callCounter = 0;

/** Calls a tool handler the way the Copilot runtime does. */
export async function callTool(tool: Tool, args: unknown): Promise<unknown> {
  if (!tool.handler) throw new Error(`Tool ${tool.name} has no handler`);
  const invocation: ToolInvocation = {
    sessionId: "test-session",
    toolCallId: `call-${++callCounter}`,
    toolName: tool.name,
    arguments: args,
  };
  return tool.handler(args, invocation);
}

export const validAnalysis = (): SubmitAnalysisInput => ({
  actors: ["Dispatcher", "Driver"],
  capabilities: ["Reassign routes during the day"],
  externalSystems: ["ERP"],
  constraints: ["Use existing systems"],
  openQuestions: ["Who approves a reassignment?"],
  evidence: [{ sourceId: "solution-brief", quotation: "route changes are made by phone" }],
});
