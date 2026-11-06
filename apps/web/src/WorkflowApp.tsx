import type { Workflow, WorkflowDetail } from "@loom/contracts";
import { useEffect, useState } from "react";
import { App } from "./App.tsx";
import { api } from "./api.ts";

const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));
const label = (state: string) => state.toLowerCase().replaceAll("_", " ");
export function WorkflowApp({ onKnowledge }: { onKnowledge?: () => void } = {}) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [task, setTask] = useState(
    "Analyse the FruitTrucks solution brief. Identify actors, capabilities, external systems, constraints and open questions, with source evidence.",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    void revision; // A decision requests an immediate fresh snapshot.
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const [list, current] = await Promise.all([
          api.workflows(abort.signal),
          selected ? api.workflow(selected, abort.signal) : Promise.resolve(null),
        ]);
        if (!abort.signal.aborted) {
          setWorkflows(list.workflows);
          setDetail(current);
        }
      } catch (cause) {
        if (!abort.signal.aborted) setError(message(cause));
      }
      if (!abort.signal.aborted) timer = setTimeout(() => void refresh(), 1000);
    };
    void refresh();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [selected, revision]);
  const select = (id: string) => {
    setSelected(id);
    setDetail(null);
    setReason("");
    setError(null);
  };
  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const workflow = await api.createWorkflow(task);
      select(workflow.id);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const review = async (action: "accept" | "reject") => {
    if (!detail || detail.workflow.id !== selected) return;
    const id = detail.workflow.id;
    setBusy(true);
    setError(null);
    try {
      await api.review(id, action, detail.workflow.version, reason);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
      setRevision((n) => n + 1);
    }
  };
  if (runId) return <App initialRunId={runId} onBack={() => setRunId(null)} />;
  const current = detail?.workflow.id === selected ? detail : null;
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Loom</span>
        {onKnowledge && (
          <button type="button" className="secondary" onClick={onKnowledge}>
            Knowledge
          </button>
        )}
        <span className="pill">Session 02</span>
        <span>Workflows</span>
        <span className="top-note">Agent analysis. Human decision.</span>
      </header>
      <main className="content">
        <div className="page-heading">
          <div>
            <h1>From analysis to a reviewed proposal</h1>
            <p className="muted">Loom keeps the process moving through failures and restarts.</p>
          </div>
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <div className="workflow-grid">
          <section className="panel">
            <h2>New workflow</h2>
            <label htmlFor="workflow-task">What should the agent analyse?</label>
            <textarea
              id="workflow-task"
              value={task}
              maxLength={2000}
              rows={5}
              onChange={(e) => setTask(e.target.value)}
            />
            <button type="button" disabled={busy || !task.trim()} onClick={() => void create()}>
              Start workflow
            </button>
            <p className="small muted">Up to three attempts. Each attempt uses your Copilot allowance.</p>
            <h3>Recent workflows</h3>
            <ul className="workflow-list">
              {workflows.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    className="secondary"
                    aria-current={selected === w.id ? "true" : undefined}
                    disabled={busy}
                    onClick={() => select(w.id)}
                  >
                    <strong>{w.task}</strong>
                    <small>
                      {label(w.state)} · attempt {w.attempt}/{w.maxAttempts}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
            {!workflows.length && <p className="muted">Your first workflow will appear here.</p>}
          </section>
          <section className="panel workflow-detail">
            {current ? (
              <>
                <h2>{current.workflow.task}</h2>
                <span
                  className={`badge ${current.workflow.state === "ACCEPTED" ? "ok" : "warn"}`}
                  role="status"
                >
                  {label(current.workflow.state)}
                </span>
                <p className="small muted">
                  Attempt {current.workflow.attempt} of {current.workflow.maxAttempts} · version{" "}
                  {current.workflow.version}
                </p>
                {current.workflow.error && <p className="alert">{current.workflow.error}</p>}
                <h3>Workflow history</h3>
                <ol className="timeline">
                  {current.events.map((event) => (
                    <li key={event.version}>
                      <span className="event-meta">
                        {event.version} · {label(event.to)} · {new Date(event.at).toLocaleTimeString()}
                      </span>
                      <p>{event.reason}</p>
                      {event.to === "ANALYSING" && event.runId && (
                        <button type="button" className="secondary" onClick={() => setRunId(event.runId)}>
                          Open attempt in Agent Console
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
                {current.result && (
                  <>
                    <h3>Analysis proposal</h3>
                    <p className="muted">
                      Check the evidence and open questions before making your decision.
                    </p>
                    {(
                      ["actors", "capabilities", "externalSystems", "constraints", "openQuestions"] as const
                    ).map((key) => (
                      <div key={key}>
                        <h4>
                          {
                            {
                              actors: "Actors",
                              capabilities: "Capabilities",
                              externalSystems: "External systems",
                              constraints: "Constraints",
                              openQuestions: "Open questions",
                            }[key]
                          }
                        </h4>
                        <ul>
                          {current.result?.result[key].map((value) => (
                            <li key={value}>{value}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <h4>Evidence</h4>
                    {current.result.result.evidence.map((e) => (
                      <blockquote key={`${e.sourceId}-${e.quotation}`}>
                        <p>{e.quotation}</p>
                        <cite>{e.sourceId}</cite>
                      </blockquote>
                    ))}
                  </>
                )}
                {current.workflow.state === "AWAITING_REVIEW" && (
                  <div className="review-actions">
                    <label htmlFor="review-reason">Reason for your decision</label>
                    <textarea
                      id="review-reason"
                      rows={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <div className="actions">
                      <button
                        type="button"
                        disabled={busy || !reason.trim()}
                        onClick={() => void review("accept")}
                      >
                        Accept proposal
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy || !reason.trim()}
                        onClick={() => void review("reject")}
                      >
                        Reject proposal
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty">
                {selected
                  ? "Loading workflow…"
                  : "Select a workflow to inspect its history, analysis and review decision."}
              </div>
            )}
          </section>
        </div>
        <footer className="small muted">
          Workflow history and proposals survive API restarts. Detailed agent traces remain in memory. One
          local API process per database.
        </footer>
      </main>
    </div>
  );
}
