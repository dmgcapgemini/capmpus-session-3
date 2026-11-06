import type { RunDetail, RunEvent, RunStatus } from "@loom/contracts";

export type ConsoleState = {
  runId: string | null;
  events: RunEvent[];
  lastSeq: number;
  status: RunStatus | null;
  detail: RunDetail | null;
  notice: string | null;
};
export const initialState: ConsoleState = {
  runId: null,
  events: [],
  lastSeq: 0,
  status: null,
  detail: null,
  notice: null,
};
export type Action =
  | { type: "select"; id: string }
  | { type: "event"; event: RunEvent }
  | { type: "detail"; detail: RunDetail }
  | { type: "notice"; id: string; message: string };
export function consoleReducer(state: ConsoleState, action: Action): ConsoleState {
  if (action.type === "select") return { ...initialState, runId: action.id, status: "running" };
  if (action.type === "notice")
    return action.id === state.runId ? { ...state, notice: action.message } : state;
  if (action.type === "detail") {
    if (action.detail.run.id !== state.runId) return state;
    return {
      ...state,
      detail: action.detail,
      status: state.status && state.status !== "running" ? state.status : action.detail.run.status,
    };
  }
  const event = action.event;
  if (event.runId !== state.runId || event.seq <= state.lastSeq) return state;
  return {
    ...state,
    events: [...state.events, event].slice(-2000),
    lastSeq: event.seq,
    status: event.type === "run.finished" ? event.status : state.status,
  };
}
export const isProblem = (event: RunEvent) =>
  event.type === "error" ||
  event.type === "tool.denied" ||
  (event.type === "run.submission" && !["started", "stored"].includes(event.outcome)) ||
  (event.type === "tool.completed" && !event.success);
export function eventSummary(event: RunEvent): string {
  switch (event.type) {
    case "run.recovery":
      return `Completion recovery attempt ${event.attempt}`;
    case "run.submission":
      return event.message;
    case "run.started":
      return "Analysis started";
    case "context.supplied":
      return `Context supplied: ${event.toolNames.length} tools, ${event.systemPromptChars.toLocaleString()} system-prompt characters`;
    case "assistant.message":
      return event.content;
    case "assistant.delta":
      return event.text;
    case "tool.requested":
      return `${event.toolName}: ${JSON.stringify(event.arguments)}`;
    case "tool.completed":
      return `${event.toolName}: ${event.success ? "succeeded" : "failed"} — ${event.summary}`;
    case "tool.denied":
      return `${event.toolName}: denied (${event.rule}). ${event.reason}`;
    case "usage":
      return `${event.model}: ${event.inputTokens} input / ${event.outputTokens} output tokens`;
    case "run.finished":
      return `Run ${event.status}${event.error ? `: ${event.error}` : ""}`;
    case "error":
      return event.message;
    case "raw":
      return event.sdkType;
  }
}
