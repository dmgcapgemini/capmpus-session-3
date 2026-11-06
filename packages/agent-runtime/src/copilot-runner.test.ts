import { CopilotClient, type SessionConfig, type SessionEvent } from "@github/copilot-sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveClientOptions } from "./client-options.ts";
import { CopilotAgentRunner } from "./copilot-runner.ts";
import type { RunInput } from "./runner.ts";
import { sdkEvent } from "./testing.ts";

let config: SessionConfig;
let emit: (event: SessionEvent) => void;
let saved: boolean;
const session = {
  sessionId: "completion-session",
  on: vi.fn((handler: (event: SessionEvent) => void) => {
    emit = handler;
    return () => {};
  }),
  sendAndWait: vi.fn(),
  abort: vi.fn(async () => {}),
  disconnect: vi.fn(async () => {}),
};
function setup(options: { timeoutMs?: number; toolCallBudget?: number } = {}) {
  const runner = new CopilotAgentRunner(resolveClientOptions({}), {
    workingDirectory: "/tmp/loom-completion-tests",
    ...options,
  });
  const input: RunInput = {
    runId: "test",
    task: "What licence?",
    instructions: "Submit an answer",
    tools: [{ name: "submit_knowledge_answer" }],
    hasReadSource: () => true,
    completion: { hasResult: () => saved, prompt: "Please submit the answer" },
    onEvent: vi.fn(),
  };
  return { runner, input };
}
beforeEach(() => {
  saved = false;
  session.sendAndWait.mockReset();
  session.abort.mockClear();
  session.disconnect.mockClear();
  vi.spyOn(CopilotClient.prototype, "start").mockResolvedValue(undefined);
  vi.spyOn(CopilotClient.prototype, "createSession").mockImplementation(async (options) => {
    if (!options) throw new Error("Expected session configuration");
    config = options;
    return session as unknown as Awaited<ReturnType<CopilotClient["createSession"]>>;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Copilot completion recovery", () => {
  it("continues the same session after idle without a result and stops once storage succeeds", async () => {
    session.sendAndWait.mockResolvedValueOnce(undefined).mockImplementationOnce(async () => {
      saved = true;
    });
    const { runner, input } = setup();
    expect(await runner.start(input).done).toMatchObject({ kind: "idle", sessionId: "completion-session" });
    expect(session.sendAndWait).toHaveBeenCalledTimes(2);
    expect(session.sendAndWait.mock.calls[1]?.[0]).toEqual({ prompt: input.completion?.prompt });
    expect(input.onEvent).toHaveBeenCalledWith({ type: "run.recovery", attempt: 1 });
    expect(session.disconnect).toHaveBeenCalledOnce();
  });
  it("does not retry a successfully stored answer", async () => {
    session.sendAndWait.mockImplementation(async () => {
      saved = true;
    });
    const { runner, input } = setup();
    await runner.start(input).done;
    expect(session.sendAndWait).toHaveBeenCalledOnce();
  });
  it("bounds missing-submission recovery to two additional turns", async () => {
    const { runner, input } = setup();
    expect(await runner.start(input).done).toMatchObject({ kind: "idle", failureCode: "missing_submission" });
    expect(session.sendAndWait).toHaveBeenCalledTimes(3);
    expect(input.onEvent).toHaveBeenCalledWith({ type: "run.recovery", attempt: 2 });
  });
  it("keeps the same tool-call budget across recovery turns", async () => {
    session.sendAndWait.mockImplementation(async () => {
      const decision = await config.hooks?.onPreToolUse?.(
        { toolName: "submit_knowledge_answer" } as never,
        {} as never,
      );
      expect(decision).toMatchObject({ permissionDecision: "allow" });
    });
    const { runner, input } = setup({ toolCallBudget: 2 });
    expect(await runner.start(input).done).toMatchObject({ failureCode: "tool_budget" });
    expect(session.sendAndWait).toHaveBeenCalledTimes(2);
  });
  it("uses the remaining time rather than resetting the timeout for recovery", async () => {
    let now = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    session.sendAndWait.mockImplementation(async () => {
      now += 60;
    });
    const { runner, input } = setup({ timeoutMs: 100 });
    expect(await runner.start(input).done).toMatchObject({ kind: "timeout" });
    expect(session.sendAndWait.mock.calls.map((call) => call[1])).toEqual([100, 40]);
    expect(session.abort).toHaveBeenCalledOnce();
  });
  it("does not continue a cancelled run", async () => {
    const { runner, input } = setup();
    const handle = runner.start(input);
    session.sendAndWait.mockImplementation(async () => {
      await handle.stop();
    });
    expect(await handle.done).toMatchObject({ kind: "stopped" });
    expect(session.sendAndWait).toHaveBeenCalledOnce();
    expect(session.abort).toHaveBeenCalledOnce();
  });
  it("honours cancellation between the initial turn and recovery", async () => {
    const { runner, input } = setup();
    const handle = runner.start(input);
    input.onEvent = (event) => {
      if (event.type === "run.recovery") void handle.stop();
    };
    expect(await handle.done).toMatchObject({ kind: "stopped" });
    expect(session.sendAndWait).toHaveBeenCalledOnce();
  });
  it("does not retry a runtime exception", async () => {
    session.sendAndWait.mockRejectedValue(new Error("Provider unavailable"));
    const { runner, input } = setup();
    expect(await runner.start(input).done).toMatchObject({ kind: "error", error: "Provider unavailable" });
    expect(session.sendAndWait).toHaveBeenCalledOnce();
  });
  it("treats an SDK error event as a runtime failure even if sendAndWait resolves", async () => {
    session.sendAndWait.mockImplementation(async () => {
      emit(sdkEvent("session.error", { message: "Provider disconnected" }));
    });
    const { runner, input } = setup();
    expect(await runner.start(input).done).toMatchObject({ kind: "error", error: "Provider disconnected" });
    expect(session.sendAndWait).toHaveBeenCalledOnce();
  });
  it("does not send a question when stopped during session setup", async () => {
    const { runner, input } = setup();
    const handle = runner.start(input);
    await handle.stop();
    expect(await handle.done).toMatchObject({ kind: "stopped" });
    expect(session.sendAndWait).not.toHaveBeenCalled();
  });
});
