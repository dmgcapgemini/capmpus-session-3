import { randomUUID } from "node:crypto";
import {
  type AgentRunner,
  ANALYSIS_INSTRUCTIONS,
  DEFAULT_ANALYSIS_TASK,
  type RunInput,
  TOOL_CALL_BUDGET,
} from "@loom/agent-runtime";
import {
  type AnalysisResultStore,
  createAnalysisTools,
  createRunToolState,
  SESSION_01_TOOL_NAMES,
  type SourceRegistry,
} from "@loom/agent-tools";
import type { AgentProfile, RunDiagnostics, RunEventPayload, RunTotals } from "@loom/contracts";
import {
  analysisResultStore,
  createRun,
  finishRun,
  getAnalysisResult,
  getRun,
  type LoomDatabase,
  listRuns,
  markInterruptedRuns,
} from "@loom/persistence";
import { RunHub } from "./hub.ts";

export class RunError extends Error {
  readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ActiveRun = { id: string; stop?: () => Promise<void>; done?: Promise<void> };

export class RunService {
  readonly hub = new RunHub();
  #active: ActiveRun | undefined;
  #closing = false;
  readonly db: LoomDatabase;
  readonly registry: SourceRegistry;
  readonly runner: AgentRunner;
  readonly log: (error: unknown) => void;
  constructor(
    db: LoomDatabase,
    registry: SourceRegistry,
    runner: AgentRunner,
    log: (error: unknown) => void,
  ) {
    this.db = db;
    this.registry = registry;
    this.runner = runner;
    this.log = log;
  }

  async initialize() {
    await markInterruptedRuns(this.db);
  }
  profile(): AgentProfile {
    return {
      toolNames: [...SESSION_01_TOOL_NAMES],
      toolCallBudget: TOOL_CALL_BUDGET,
      clientProfile: this.runner.profile,
      runtime: this.runner.runtime,
      model: this.runner.model,
      defaultTask: DEFAULT_ANALYSIS_TASK,
    };
  }
  list() {
    return listRuns(this.db);
  }
  async detail(id: string) {
    const run = await getRun(this.db, id);
    if (!run) throw new RunError(404, "Run not found");
    return { run, result: await getAnalysisResult(this.db, id) };
  }

  async wait(id: string) {
    if (this.#active?.id === id) await this.#active.done;
    return this.detail(id);
  }

  async start(
    task = DEFAULT_ANALYSIS_TASK,
    options: {
      createCapability?: (runId: string) => {
        tools: RunInput["tools"];
        hasReadSource: () => boolean;
        hasResult: () => boolean;
      };
      results?: AnalysisResultStore;
      instructions?: string;
      recoverOnShutdown?: boolean;
      onCreated?: (runId: string) => Promise<unknown>;
    } = {},
  ): Promise<string> {
    if (this.#closing) throw new RunError(503, "The API is shutting down");
    if (this.#active) throw new RunError(409, "A run is already active");
    // Reserve before the first await: two concurrent starts must not both create a run.
    const active: ActiveRun = { id: randomUUID() };
    this.#active = active;
    try {
      await createRun(this.db, {
        id: active.id,
        task,
        clientProfile: this.runner.profile,
        model: this.runner.model,
      });
      await options.onCreated?.(active.id);
      this.hub.create(active.id);
      const state = createRunToolState();
      const totals: RunTotals = {
        modelCalls: 0,
        inputTokens: 0,
        outputTokens: 0,
        toolCalls: 0,
        deniedToolCalls: 0,
      };
      const diagnostics: RunDiagnostics = {
        termination: "missing_submission",
        recoveries: 0,
        submissionAttempts: 0,
        assistantMessages: [],
        events: [],
        truncated: false,
      };
      const record = (kind: string, message: string) => {
        if (diagnostics.events.length === 40) {
          diagnostics.events.shift();
          diagnostics.truncated = true;
        }
        if (message.length > 1000) diagnostics.truncated = true;
        diagnostics.events.push({
          id: randomUUID(),
          at: new Date().toISOString(),
          kind,
          message: message.slice(0, 1000),
        });
      };
      const submissionTools = new Set(["submit_knowledge_answer", "submit_analysis_result"]);
      const submissionCalls = new Set<string>();
      const submissionOutcomes = new Set<string>();
      const countSubmission = (id: string) => {
        if (!submissionCalls.has(id)) {
          submissionCalls.add(id);
          diagnostics.submissionAttempts++;
        }
      };
      const onEvent = (event: RunEventPayload) => {
        if (event.type === "assistant.message" || event.type === "assistant.delta") {
          const existing = diagnostics.assistantMessages.find((message) => message.id === event.messageId);
          const content =
            event.type === "assistant.message" ? event.content : (existing?.content ?? "") + event.text;
          if (content.length > 16000) diagnostics.truncated = true;
          const message = {
            id: event.messageId,
            content: content.slice(0, 16000),
            partial: event.type === "assistant.delta",
          };
          if (existing) Object.assign(existing, message);
          else {
            if (diagnostics.assistantMessages.length === 20) {
              diagnostics.assistantMessages.shift();
              diagnostics.truncated = true;
            }
            diagnostics.assistantMessages.push(message);
          }
        }
        if (event.type === "run.recovery") {
          diagnostics.recoveries = event.attempt;
          record("recovery", `Completion recovery attempt ${event.attempt}: no validated answer stored`);
        }
        if (event.type === "run.submission") {
          if (event.outcome === "started") countSubmission(event.toolCallId);
          else submissionOutcomes.add(event.toolCallId);
          if (event.outcome === "rejected") diagnostics.termination = "submission_rejected";
          if (event.outcome === "storage_error" || event.outcome === "tool_error")
            diagnostics.termination = event.outcome;
          record(`submission_${event.outcome}`, event.message);
        }
        if (event.type === "tool.requested" && submissionTools.has(event.toolName))
          countSubmission(event.toolCallId);
        if (event.type === "tool.denied") {
          record("tool_denied", `${event.toolName}: ${event.reason}`);
          if (submissionTools.has(event.toolName)) {
            diagnostics.submissionAttempts++;
            diagnostics.termination = "submission_denied";
          }
        }
        if (
          event.type === "tool.completed" &&
          !event.success &&
          submissionTools.has(event.toolName) &&
          !submissionOutcomes.has(event.toolCallId)
        ) {
          diagnostics.termination = "tool_error";
          record("submission_tool_error", "Submission failed before the handler reported an outcome");
        }
        if (event.type === "tool.completed" && !event.success)
          record("tool_failed", `${event.toolName}: ${event.summary}`);
        if (event.type === "error") record("runtime_error", event.message);
        if (event.type === "usage") {
          totals.modelCalls++;
          totals.inputTokens += event.inputTokens;
          totals.outputTokens += event.outputTokens;
        }
        if (event.type === "tool.requested") totals.toolCalls++;
        if (event.type === "tool.denied") totals.deniedToolCalls++;
        this.hub.emit(active.id, event);
      };
      onEvent({ type: "run.started", task, clientProfile: this.runner.profile, model: this.runner.model });
      const capability = options.createCapability?.(active.id);
      const rawTools =
        capability?.tools ??
        createAnalysisTools({
          runId: active.id,
          registry: this.registry,
          results: options.results ?? analysisResultStore(this.db),
          state,
          log: this.log,
        });
      const hasResult = capability?.hasResult ?? (() => state.acceptedResultId !== null);
      const tools = rawTools.map((tool): RunInput["tools"][number] => {
        const handler = tool.handler;
        if (!handler || !submissionTools.has(tool.name)) return tool;
        return {
          ...tool,
          handler: async (args, invocation) => {
            onEvent({
              type: "run.submission",
              toolCallId: invocation.toolCallId,
              outcome: "started",
              message: `Called ${tool.name}`,
            });
            try {
              const result = await handler(args, invocation);
              const failed =
                typeof result === "object" &&
                result !== null &&
                "resultType" in result &&
                result.resultType === "failure";
              const internalError = failed && "error" in result && result.error === "tool-internal-error";
              const storageFailed =
                failed && "error" in result && result.error === "knowledge-storage-failed";
              const reason =
                failed && "textResultForLlm" in result
                  ? String(result.textResultForLlm)
                  : "Submission returned without a stored result";
              onEvent({
                type: "run.submission",
                toolCallId: invocation.toolCallId,
                outcome: failed
                  ? storageFailed
                    ? "storage_error"
                    : internalError
                      ? "tool_error"
                      : "rejected"
                  : hasResult()
                    ? "stored"
                    : "tool_error",
                message: failed || !hasResult() ? reason : "Validated answer saved",
              });
              return result;
            } catch (cause) {
              onEvent({
                type: "run.submission",
                toolCallId: invocation.toolCallId,
                outcome: "tool_error",
                message: "Submission handler threw an exception; see the API log",
              });
              throw cause;
            }
          },
        };
      });
      // Schedule after returning the accepted request, and turn synchronous runner failures into outcomes.
      active.done = Promise.resolve()
        .then(async () => {
          let status: "completed" | "incomplete" | "failed" | "stopped" = "failed";
          let error: string | null = null;
          let sessionId: string | null = null;
          try {
            const handle = this.runner.start({
              runId: active.id,
              task,
              tools,
              instructions: options.instructions ?? ANALYSIS_INSTRUCTIONS,
              hasReadSource: capability?.hasReadSource ?? (() => state.readSourceIds.size > 0),
              onEvent,
              completion: {
                hasResult,
                prompt: capability
                  ? "Your turn ended without a stored answer. Complete the question by calling submit_knowledge_answer with eligible evidence and exact quotations. Correct any validation error from the tool. If no eligible evidence is available, submit an empty answer and citations with an explicit uncertainty explanation. Plain text does not save the answer. Do not repeat successful retrievals unless evidence has expired or more evidence is needed."
                  : "Your turn ended without a stored result. Use submit_analysis_result to save a validated analysis based on sources you have read. Correct any tool validation errors. Plain text does not save a result.",
              },
            });
            active.stop = handle.stop;
            if (this.#closing) await handle.stop();
            const outcome = await handle.done;
            sessionId = outcome.sessionId;
            error = outcome.error ?? null;
            status =
              outcome.kind === "idle"
                ? !hasResult()
                  ? "incomplete"
                  : "completed"
                : outcome.kind === "stopped"
                  ? "stopped"
                  : "failed";
            if (status === "stopped" && this.#closing && options.recoverOnShutdown) {
              status = "failed";
              error = "interrupted: the API shut down";
            }
            if (status === "completed") diagnostics.termination = "completed";
            else if (outcome.kind === "stopped") diagnostics.termination = "stopped";
            else if (outcome.kind === "timeout") diagnostics.termination = "timeout";
            else if (outcome.kind === "error") diagnostics.termination = "runtime_error";
            else if (outcome.failureCode === "tool_budget") diagnostics.termination = "tool_budget";
            if (status === "incomplete") {
              const explanation = {
                missing_submission: "The agent did not submit a validated answer",
                submission_rejected: "Answer submission was rejected by validation",
                submission_denied: "Answer submission was denied by the tool policy",
                storage_error: "Answer submission failed during storage",
                tool_error: "The submission tool failed",
                tool_budget: "The tool-call budget was exhausted before an answer was saved",
              };
              error = `${explanation[diagnostics.termination as keyof typeof explanation] ?? "No validated answer was saved"}. Submission attempts: ${diagnostics.submissionAttempts}; completion recovery attempts: ${diagnostics.recoveries}. See the saved run diagnostics.`;
            }
          } catch (cause) {
            this.log(cause);
            error = "Agent execution failed; see the API log";
            diagnostics.termination = "runtime_error";
          }
          record("finished", error ?? `Run ${status}`);
          try {
            await finishRun(this.db, active.id, { status, error, sessionId, totals, diagnostics });
          } catch (cause) {
            this.log({ runId: active.id, stage: "persist_run_outcome", err: cause, diagnostics });
            status = "failed";
            error = "Could not persist the run outcome; see the API log";
          }
          if (status === "failed" && error) onEvent({ type: "error", message: error });
          onEvent({ type: "run.finished", status, analysisResultId: state.acceptedResultId, error, totals });
        })
        .finally(() => {
          if (this.#active === active) this.#active = undefined;
        });
      return active.id;
    } catch (error) {
      await finishRun(this.db, active.id, {
        status: "failed",
        error: "Run setup failed",
        sessionId: null,
        totals: { modelCalls: 0, inputTokens: 0, outputTokens: 0, toolCalls: 0, deniedToolCalls: 0 },
      }).catch(this.log);
      this.#active = undefined;
      throw error;
    }
  }

  async stop(id: string) {
    await this.detail(id);
    const active = this.#active;
    if (!active || active.id !== id) throw new RunError(409, "Run is not active");
    await active.stop?.();
  }

  async close() {
    this.#closing = true;
    const active = this.#active;
    await active?.stop?.();
    await active?.done;
    await this.runner.close();
  }
}
