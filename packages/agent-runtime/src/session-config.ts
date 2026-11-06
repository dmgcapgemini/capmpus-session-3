import { type SessionConfig, type Tool, ToolSet } from "@github/copilot-sdk";
import type { RunGuards } from "./policy.ts";

export type SessionConfigInput = {
  tools: Tool[];
  instructions: string;
  guards: RunGuards;
  workingDirectory: string;
  model?: string;
};

/** Session options for one run: Loom's tools and instructions, nothing ambient (ADR 0009). */
export function buildSessionConfig(input: SessionConfigInput): SessionConfig {
  const registration = { tools: [] as Tool[], instructions: "" };

  registration.tools = input.tools;
  registration.instructions = input.instructions;

  const availableTools = registration.tools.reduce((set, tool) => set.addCustom(tool.name), new ToolSet());

  return {
    ...(input.model ? { model: input.model } : {}),
    streaming: true,
    tools: registration.tools,
    availableTools,
    onPermissionRequest: input.guards.onPermissionRequest,
    hooks: { onPreToolUse: input.guards.onPreToolUse },
    systemMessage: {
      mode: "customize",
      sections: {
        environment_context: { action: "remove" },
        code_change_rules: { action: "remove" },
      },
      content: registration.instructions,
    },
    workingDirectory: input.workingDirectory,
    infiniteSessions: { enabled: false },
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
  };
}
