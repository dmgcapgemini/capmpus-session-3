import type { SessionEvent } from "@github/copilot-sdk";
import type { RunEventPayload } from "@loom/contracts";

const MAX_RAW_CHARS = 4_000;
const MAX_SUMMARY_CHARS = 300;

/** SDK event types that are too frequent to keep as raw events. */
const HIGH_VOLUME = new Set([
  "assistant.message_delta",
  "assistant.streaming_delta",
  "assistant.reasoning_delta",
  "assistant.tool_call_delta",
]);

/** SDK event types whose full data is worth keeping (the context supplied to the model). */
const KEEP_FULL = new Set(["system.message"]);

const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}…` : text);

function rawData(type: string, data: unknown): unknown {
  if (KEEP_FULL.has(type)) return data;
  const json = JSON.stringify(data) ?? "null";
  return json.length > MAX_RAW_CHARS ? { truncated: true, preview: truncate(json, MAX_RAW_CHARS) } : data;
}

/**
 * Translates Copilot session events into Loom trace events for one run.
 * Unknown event types produce only a raw event, so new SDK events never break a run.
 */
export function createEventMapper(context: { toolNames: readonly string[]; instructions: string }) {
  const toolNamesByCallId = new Map<string, string>();

  return (event: SessionEvent): RunEventPayload[] => {
    if (HIGH_VOLUME.has(event.type)) {
      return event.type === "assistant.message_delta"
        ? [{ type: "assistant.delta", messageId: event.data.messageId, text: event.data.deltaContent }]
        : [];
    }

    const mapped: RunEventPayload[] = [];
    switch (event.type) {
      case "system.message":
        mapped.push({
          type: "context.supplied",
          toolNames: [...context.toolNames],
          instructions: context.instructions,
          systemPromptChars: event.data.content.length,
        });
        break;
      case "assistant.message":
        if (event.data.content.trim()) {
          mapped.push({
            type: "assistant.message",
            messageId: event.data.messageId,
            content: event.data.content,
          });
        }
        break;
      case "tool.execution_start":
        toolNamesByCallId.set(event.data.toolCallId, event.data.toolName);
        mapped.push({
          type: "tool.requested",
          toolCallId: event.data.toolCallId,
          toolName: event.data.toolName,
          arguments: event.data.arguments ?? {},
        });
        break;
      case "tool.execution_complete":
        mapped.push({
          type: "tool.completed",
          toolCallId: event.data.toolCallId,
          toolName: toolNamesByCallId.get(event.data.toolCallId) ?? "unknown",
          success: event.data.success,
          summary: truncate(
            event.data.success
              ? (event.data.result?.content ?? "")
              : (event.data.error?.message ?? event.data.result?.content ?? "failed"),
            MAX_SUMMARY_CHARS,
          ),
        });
        break;
      case "assistant.usage":
        mapped.push({
          type: "usage",
          model: event.data.model,
          inputTokens: event.data.inputTokens ?? 0,
          outputTokens: event.data.outputTokens ?? 0,
          durationMs: event.data.duration ?? null,
        });
        break;
      case "session.error":
        mapped.push({ type: "error", message: event.data.message });
        break;
    }

    mapped.push({ type: "raw", sdkType: event.type, data: rawData(event.type, event.data) });
    return mapped;
  };
}
