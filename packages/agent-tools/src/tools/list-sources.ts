import { defineTool } from "@github/copilot-sdk";
import type { ListSourcesResult } from "@loom/contracts";
import { z } from "zod";
import type { ToolContext } from "./context.ts";

/** Read-only: lists the sources declared for the workspace. */
export const listSourcesTool = (ctx: ToolContext) =>
  defineTool("list_sources", {
    description: "List the sources available in the Loom workspace. Returns IDs to use with read_source.",
    parameters: z.object({}),
    defer: "never",
    handler: (): ListSourcesResult => ({ sources: ctx.registry.list() }),
  });
