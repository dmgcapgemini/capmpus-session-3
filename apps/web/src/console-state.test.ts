import type { RunDetail, RunEvent } from "@loom/contracts";
import { describe, expect, it } from "vitest";
import { consoleReducer, initialState, isProblem } from "./console-state.ts";

const event = (seq: number, runId = "a"): RunEvent => ({
  type: "error",
  message: "failure",
  seq,
  runId,
  at: "2026-09-14T00:00:00Z",
});
describe("console event recovery", () => {
  it("ignores duplicate replay and late events from another run", () => {
    let state = consoleReducer(initialState, { type: "select", id: "a" });
    state = consoleReducer(state, { type: "event", event: event(3) });
    expect(consoleReducer(state, { type: "event", event: event(3) })).toBe(state);
    expect(consoleReducer(state, { type: "event", event: event(4, "b") })).toBe(state);
    expect(state.events).toHaveLength(1);
  });
  it("does not regress a terminal event when an older detail request resolves", () => {
    const state = { ...initialState, runId: "a", status: "completed" as const };
    const detail = { run: { id: "a", status: "running" }, result: null } as RunDetail;
    expect(consoleReducer(state, { type: "detail", detail }).status).toBe("completed");
    expect(consoleReducer(state, { type: "notice", id: "b", message: "old error" })).toBe(state);
  });
  it("classifies failed tool outcomes and denials as problems", () => {
    expect(
      isProblem({
        ...event(1),
        type: "tool.completed",
        toolCallId: "t",
        toolName: "read_source",
        success: false,
        summary: "Unknown source",
      }),
    ).toBe(true);
    expect(
      isProblem({
        ...event(1),
        type: "tool.denied",
        toolName: "shell",
        stage: "permission",
        rule: "loom-tools-only",
        reason: "No shell",
      }),
    ).toBe(true);
  });
});
