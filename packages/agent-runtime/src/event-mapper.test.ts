import { describe, expect, it } from "vitest";
import { createEventMapper } from "./event-mapper.ts";
import { sdkEvent } from "./testing.ts";

describe("SDK event mapping", () => {
  it("correlates tool outcomes and preserves corrective failures", () => {
    const map = createEventMapper({ toolNames: ["read_source"], instructions: "Only sources" });
    expect(
      map(
        sdkEvent("tool.execution_start", {
          toolCallId: "a",
          toolName: "read_source",
          arguments: { sourceId: "bad" },
        }),
      )[0],
    ).toMatchObject({ type: "tool.requested", toolName: "read_source" });
    expect(
      map(
        sdkEvent("tool.execution_complete", {
          toolCallId: "a",
          success: false,
          error: { message: "Unknown source", code: "failure" },
        }),
      )[0],
    ).toMatchObject({
      type: "tool.completed",
      toolName: "read_source",
      success: false,
      summary: "Unknown source",
    });
  });
  it("keeps context and unknown raw events, without retaining streaming deltas twice", () => {
    const map = createEventMapper({ toolNames: ["read_source"], instructions: "Only sources" });
    expect(map(sdkEvent("system.message", { content: "full prompt" }))[0]).toEqual({
      type: "context.supplied",
      toolNames: ["read_source"],
      instructions: "Only sources",
      systemPromptChars: 11,
    });
    expect(map(sdkEvent("future.event", { a: 1 }))).toEqual([
      { type: "raw", sdkType: "future.event", data: { a: 1 } },
    ]);
    expect(map(sdkEvent("assistant.message_delta", { messageId: "m", deltaContent: "hello" }))).toEqual([
      { type: "assistant.delta", messageId: "m", text: "hello" },
    ]);
  });
});
