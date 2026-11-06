import type { AgentRunner, RunInput } from "@loom/agent-runtime";
import { ScriptedAgentRunner, type ScriptStep } from "@loom/agent-runtime/testing";
import { type EvaluationQuestion, RetrievalReport } from "@loom/contracts";
export const retrievalToolNames = {
  documents: "search_documents",
  records: "lookup_records",
  fms: "get_vehicle_status",
} as const;
/** Scripted plumbing fixture. Tool selection comes from the fixture, never from a model. */
export function knowledgeScriptedRunner(
  calls: (input: RunInput) => EvaluationQuestion["calls"],
): AgentRunner {
  return {
    profile: "workshop",
    runtime: "scripted",
    model: "scripted-knowledge-fixture",
    close: async () => {},
    start(input: RunInput) {
      const reports: RetrievalReport[] = [];
      const submission: ScriptStep & { args: unknown } = {
        tool: "submit_knowledge_answer",
        args: { answer: "", uncertainty: "No eligible source evidence was retrieved.", citations: [] },
      };
      const steps: ScriptStep[] = [
        ...calls(input).map((call) => ({ tool: retrievalToolNames[call.adapter], args: call.input })),
        submission,
      ];
      const tools = input.tools.map((tool) => ({
        ...tool,
        handler:
          tool.handler &&
          (async (
            args: unknown,
            invocation: Parameters<NonNullable<RunInput["tools"][number]["handler"]>>[1],
          ) => {
            const result = await tool.handler?.(args, invocation);
            if (tool.name !== "submit_knowledge_answer") {
              const parsed = RetrievalReport.safeParse(result);
              if (parsed.success) reports.push(parsed.data);
              const items = [
                ...new Map(reports.flatMap((r) => r.items).map((i) => [i.evidenceRef, i])).values(),
              ];
              if (items.length)
                submission.args = {
                  answer: items
                    .map((i) => i.content)
                    .join("\n\n")
                    .slice(0, 6000),
                  uncertainty: "Scripted retrieval fixture; inspect conflicts and source authority.",
                  citations: items.map((i) => ({
                    evidenceRef: i.evidenceRef,
                    quotation: i.content.slice(0, 1000),
                  })),
                };
            }
            return result;
          }),
      }));
      return new ScriptedAgentRunner(steps).start({ ...input, tools });
    },
  };
}
