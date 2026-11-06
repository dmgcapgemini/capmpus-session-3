import type { RunEvent, RunEventPayload } from "@loom/contracts";

type Buffer = {
  seq: number;
  events: RunEvent[];
  finished: boolean;
  listeners: Set<(event: RunEvent) => void>;
};

/** Session 1 traces are bounded and process-local; persisted results survive a restart. */
export class RunHub {
  readonly #runs = new Map<string, Buffer>();
  readonly eventLimit: number;
  readonly runLimit: number;
  constructor(eventLimit = 2000, runLimit = 20) {
    this.eventLimit = eventLimit;
    this.runLimit = runLimit;
  }

  create(id: string): void {
    for (const [key, run] of this.#runs) {
      if (this.#runs.size < this.runLimit) break;
      if (run.finished) this.#runs.delete(key);
    }
    this.#runs.set(id, { seq: 0, events: [], finished: false, listeners: new Set() });
  }

  get(id: string) {
    return this.#runs.get(id);
  }

  emit(id: string, payload: RunEventPayload): void {
    const run = this.#runs.get(id);
    if (!run || run.finished) return;
    const event = { ...payload, runId: id, seq: ++run.seq, at: new Date().toISOString() } as RunEvent;
    run.events.push(event);
    if (run.events.length > this.eventLimit) run.events.shift();
    if (payload.type === "run.finished") run.finished = true;
    for (const listener of [...run.listeners]) listener(event);
  }
}
