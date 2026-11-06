import { defineTool, type Tool } from "@github/copilot-sdk";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ANALYSIS_INSTRUCTIONS } from "./instructions.ts";
import { createRunGuards } from "./policy.ts";
import { buildSessionConfig } from "./session-config.ts";

const tools = [
  defineTool("list_sources", { parameters: z.object({}), handler: () => ({ sources: [] }) }),
  defineTool("read_source", { parameters: z.object({ sourceId: z.string() }), handler: () => "x" }),
];

const config = () =>
  buildSessionConfig({
    tools: tools as Tool[],
    instructions: ANALYSIS_INSTRUCTIONS,
    guards: createRunGuards({
      toolNames: ["list_sources", "read_source"],
      hasReadSource: () => false,
      onDenied: () => {},
    }),
    workingDirectory: "/work/loom/.loom/agent-workdir",
  });

describe("hardened session config", () => {
  it("disables every ambient feature", () => {
    expect(config()).toMatchObject({
      skipCustomInstructions: true,
      enableOnDemandInstructionDiscovery: false,
      enableFileHooks: false,
      enableConfigDiscovery: false,
      enableSkills: false,
      includedBuiltinSkills: [],
      memory: { enabled: false },
      enableSessionStore: false,
      enableHostGitOperations: false,
      skipEmbeddingRetrieval: true,
      infiniteSessions: { enabled: false },
      workingDirectory: "/work/loom/.loom/agent-workdir",
    });
  });

  it("removes the host environment from the system prompt", () => {
    expect(config().systemMessage).toMatchObject({
      mode: "customize",
      sections: { environment_context: { action: "remove" } },
    });
  });

  it("wires Loom's permission handler and pre-tool hook", () => {
    const c = config();
    expect(typeof c.onPermissionRequest).toBe("function");
    expect(typeof c.hooks?.onPreToolUse).toBe("function");
  });
});

describe("workshop session-01: session registration", () => {
  it("registers exactly the run's tools and makes only those available", () => {
    const c = config();
    expect(c.tools?.map((tool) => tool.name)).toEqual(["list_sources", "read_source"]);
    const available = Array.isArray(c.availableTools) ? c.availableTools : c.availableTools?.toArray();
    expect(available).toEqual(["custom:list_sources", "custom:read_source"]);
  });

  it("passes Loom's instructions to the session", () => {
    expect((config().systemMessage as { content?: string }).content).toBe(ANALYSIS_INSTRUCTIONS);
  });
});
