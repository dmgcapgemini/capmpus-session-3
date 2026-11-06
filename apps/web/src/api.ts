import {
  AgentProfile,
  KnowledgeQueryDetail,
  KnowledgeQueryList,
  ListSourcesResult,
  RunDetail,
  RunList,
  StartRunResponse,
  Workflow,
  WorkflowDetail,
  WorkflowList,
} from "@loom/contracts";

async function request(path: string, options?: RequestInit): Promise<unknown> {
  const response = await fetch(`/api${path}`, options);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? body.message ?? `Request failed (${response.status})`);
  return body;
}
const post = (body = {}) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const api = {
  knowledgeQueries: async (signal?: AbortSignal) =>
    KnowledgeQueryList.parse(await request("/knowledge", { signal })),
  knowledgeDetail: async (id: string, signal?: AbortSignal) =>
    KnowledgeQueryDetail.parse(await request(`/knowledge/${encodeURIComponent(id)}`, { signal })),
  askKnowledge: async (task: string) => StartRunResponse.parse(await request("/knowledge", post({ task }))),
  workflows: async (signal?: AbortSignal) => WorkflowList.parse(await request("/workflows", { signal })),
  workflow: async (id: string, signal?: AbortSignal) =>
    WorkflowDetail.parse(await request(`/workflows/${encodeURIComponent(id)}`, { signal })),
  createWorkflow: async (task: string) => Workflow.parse(await request("/workflows", post({ task }))),
  review: async (id: string, action: "accept" | "reject", version: number, reason: string) =>
    Workflow.parse(
      await request(`/workflows/${encodeURIComponent(id)}/${action}`, post({ version, reason })),
    ),
  profile: async () => AgentProfile.parse(await request("/agent/profile")),
  sources: async () => ListSourcesResult.parse(await request("/sources")),
  runs: async () => RunList.parse(await request("/agent-runs")),
  detail: async (id: string, signal?: AbortSignal) =>
    RunDetail.parse(await request(`/agent-runs/${encodeURIComponent(id)}`, { signal })),
  start: async (task: string) => StartRunResponse.parse(await request("/agent-runs", post({ task }))),
  stop: async (id: string) =>
    StartRunResponse.parse(await request(`/agent-runs/${encodeURIComponent(id)}/stop`, post())),
};
