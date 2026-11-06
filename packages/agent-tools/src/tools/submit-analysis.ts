import { defineTool } from "@github/copilot-sdk";
import { SubmitAnalysisInput, type SubmitAnalysisResult } from "@loom/contracts";
import { z } from "zod";
import type { ToolContext } from "./context.ts";
import { failure, guarded } from "./results.ts";

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

/** Checks every quotation against the sources read in this run. Returns problems, empty when valid. */
async function evidenceProblems(ctx: ToolContext, analysis: SubmitAnalysisInput): Promise<string[]> {
  const problems: string[] = [];
  for (const [index, { sourceId, quotation }] of analysis.evidence.entries()) {
    const label = `evidence[${index}]`;
    if (!ctx.state.readSourceIds.has(sourceId)) {
      problems.push(`${label} cites "${sourceId}", which was not read in this run. Read it first.`);
      continue;
    }
    const source = await ctx.registry.read(sourceId);
    if (!source || !normalise(source.content).includes(normalise(quotation))) {
      problems.push(`${label}: quotation not found in "${sourceId}": "${quotation}". Copy the text exactly.`);
    }
  }
  return problems;
}

/** The only side-effecting tool: validates the analysis and stores it for the run. */
export const submitAnalysisTool = (ctx: ToolContext) =>
  defineTool("submit_analysis_result", {
    description:
      "Submit the structured analysis of the workspace sources. Every quotation must be copied exactly from a source you read with read_source. Loom validates the analysis and stores it; if validation fails, correct the analysis and submit again.",
    parameters: SubmitAnalysisInput,
    defer: "never",
    handler: (args) =>
      guarded<SubmitAnalysisResult>("submit_analysis_result", ctx.log, async () => {
        const parsed = SubmitAnalysisInput.safeParse(args);
        if (!parsed.success) {
          return failure(`The analysis does not match the contract:\n${z.prettifyError(parsed.error)}`);
        }
        const problems = await evidenceProblems(ctx, parsed.data);
        if (problems.length > 0) return failure(`The evidence is not valid:\n- ${problems.join("\n- ")}`);

        if (ctx.state.acceptedResultId !== null && !ctx.results.idempotent) {
          return failure(
            `An analysis was already accepted for this run (result ${ctx.state.acceptedResultId}). Do not submit again.`,
          );
        }
        const saved = await ctx.results.save(ctx.runId, parsed.data);
        ctx.state.acceptedResultId = saved.id;
        return { accepted: true, analysisResultId: saved.id };
      }),
  });
