import { ANALYSIS_INSTRUCTIONS } from "@loom/agent-runtime";
import {
  claimWorkflowAttempt,
  createWorkflow,
  finishWorkflow,
  getRun,
  getWorkflow,
  type LoomDatabase,
  pendingWorkflows,
  requestWorkflowReview,
  workflowResultStore,
} from "@loom/persistence";
import { RunError, type RunService } from "../runs/service.ts";

/** One local worker. PostgreSQL owns the queue, attempts and state; no SDK session is resumed. */
export class WorkflowService {
  #timer: ReturnType<typeof setTimeout> | undefined;
  #work: Promise<void> | undefined;
  #closing = false;
  readonly db: LoomDatabase;
  readonly runs: RunService;
  readonly log: (error: unknown) => void;
  readonly eligible = new Set<string>();
  constructor(db: LoomDatabase, runs: RunService, log: (error: unknown) => void) {
    this.db = db;
    this.runs = runs;
    this.log = log;
  }

  async create(task: string, maxAttempts: number) {
    const workflow = await createWorkflow(this.db, task, maxAttempts);
    this.eligible.add(workflow.id);
    return workflow;
  }
  async initialize() {
    // RunService.initialize has already marked interrupted invocations failed.
    for (const workflow of await pendingWorkflows(this.db)) {
      this.eligible.add(workflow.id);
      if (workflow.state === "PROPOSAL_READY") {
        await requestWorkflowReview(this.db, workflow.id, workflow.version);
      } else if (workflow.state === "ANALYSING" && workflow.attempt >= workflow.maxAttempts) {
        await finishWorkflow(
          this.db,
          workflow.id,
          workflow.version,
          "Interrupted invocation exhausted the attempt budget",
        );
      }
    }
  }
  start() {
    const tick = async () => {
      if (this.#closing) return;
      await this.drain().catch(this.log);
      if (!this.#closing) this.#timer = setTimeout(() => void tick(), 1000);
    };
    this.#timer = setTimeout(() => void tick(), 0);
  }
  drain(): Promise<void> {
    if (this.#closing) return Promise.resolve();
    this.#work ??= this.processOne().finally(() => {
      this.#work = undefined;
    });
    return this.#work;
  }
  private async processOne() {
    const workflow = (await pendingWorkflows(this.db)).find((w) => this.eligible.has(w.id));
    if (!workflow || this.#closing) return;
    if (workflow.state === "PROPOSAL_READY") {
      await requestWorkflowReview(this.db, workflow.id, workflow.version);
      return;
    }
    if (workflow.state === "ANALYSING") {
      const run = workflow.runId ? await getRun(this.db, workflow.runId) : undefined;
      if (run?.status === "running") return;
      if (run?.status === "stopped" || workflow.attempt >= workflow.maxAttempts) {
        await finishWorkflow(
          this.db,
          workflow.id,
          workflow.version,
          run?.error ?? "Invocation stopped or attempt budget exhausted",
        );
        return;
      }
    }
    let runId: string;
    try {
      runId = await this.runs.start(workflow.task, {
        results: await workflowResultStore(this.db, workflow.id),
        recoverOnShutdown: true,
        instructions: `${ANALYSIS_INSTRUCTIONS}\nThis run belongs to a Loom workflow. A tool response with accepted:true means the analysis was stored for human review, not approved by a human. You cannot accept or reject the workflow. Report that your proposal awaits human review.`,
        onCreated: (id) => claimWorkflowAttempt(this.db, workflow.id, workflow.version, id),
      });
    } catch (error) {
      if (error instanceof RunError && error.statusCode === 409) return;
      throw error;
    }
    const { run } = await this.runs.wait(runId);
    if (this.#closing) return; // Preserve pending state for recovery during orderly shutdown.
    const current = await getWorkflow(this.db, workflow.id);
    if (current.state === "PROPOSAL_READY") {
      await requestWorkflowReview(this.db, current.id, current.version);
    } else if (
      current.state === "ANALYSING" &&
      (run.status === "stopped" || current.attempt >= current.maxAttempts)
    ) {
      await finishWorkflow(this.db, current.id, current.version, run.error ?? `Invocation ${run.status}`);
    }
  }
  /** Stop scheduling first; RunService.close then cancels the current invocation. */
  stopScheduling() {
    this.#closing = true;
    clearTimeout(this.#timer);
  }
  async close() {
    this.stopScheduling();
    await this.#work;
  }
}
