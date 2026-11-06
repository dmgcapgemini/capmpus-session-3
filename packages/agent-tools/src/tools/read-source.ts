import { defineTool } from "@github/copilot-sdk";
import { ReadSourceInput, type ReadSourceResult } from "@loom/contracts";
import { z } from "zod";
import type { ToolContext } from "./context.ts";
import { failure, guarded } from "./results.ts";

/** Read-only: returns the content of one declared source, identified by ID. */
export const readSourceTool = (ctx: ToolContext) =>
  defineTool("read_source", {
    description: "Read the content of one workspace source. Use an ID returned by list_sources.",
    parameters: ReadSourceInput,
    defer: "never",
    handler: (args) =>
      guarded<ReadSourceResult>("read_source", ctx.log, async () => {
        const parsed = ReadSourceInput.safeParse(args);
        if (!parsed.success) {
          return failure(`Invalid arguments for read_source: ${z.prettifyError(parsed.error)}`);
        }
        const { sourceId } = parsed.data;
        if (/[\\/]|\.\./.test(sourceId)) {
          return failure("sourceId must be an ID returned by list_sources, not a path.");
        }
        const source = await ctx.registry.read(sourceId);
        if (!source) {
          return failure(`Unknown sourceId "${sourceId}". Call list_sources to see the available IDs.`);
        }
        ctx.state.readSourceIds.add(sourceId);
        return { sourceId, name: source.name, mediaType: source.mediaType, content: source.content };
      }),
  });
