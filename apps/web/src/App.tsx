import { type AgentProfile, type AgentRun, RunEvent, type SourceSummary } from "@loom/contracts";
import { useCallback, useEffect, useReducer, useState } from "react";
import { api } from "./api.ts";
import { consoleReducer, eventSummary, initialState, isProblem } from "./console-state.ts";

const tabs = ["Context", "Tool calls", "Raw events", "Errors"] as const;
type Tab = (typeof tabs)[number];
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function App({ initialRunId, onBack }: { initialRunId?: string; onBack?: () => void } = {}) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [task, setTask] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Context");
  const [state, dispatch] = useReducer(consoleReducer, initialState);
  const refresh = useCallback(async () => {
    setRuns((await api.runs()).runs);
  }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.profile(), api.sources(), api.runs()])
      .then(([p, s, r]) => {
        if (cancelled) return;
        setProfile(p);
        setTask(p.defaultTask);
        setSources(s.sources);
        setRuns(r.runs);
        const active = r.runs.find((run) => run.status === "running");
        if (initialRunId) dispatch({ type: "select", id: initialRunId });
        else if (active) dispatch({ type: "select", id: active.id });
      })
      .catch((cause) => {
        if (!cancelled) setError(message(cause));
      });
    return () => {
      cancelled = true;
    };
  }, [initialRunId]);

  useEffect(() => {
    if (!state.runId) return;
    const id = state.runId;
    const abort = new AbortController();
    const stream = new EventSource(`/api/agent-runs/${encodeURIComponent(id)}/events`);
    const detail = async () => {
      const result = await api.detail(id, abort.signal);
      if (!abort.signal.aborted) dispatch({ type: "detail", detail: result });
      return result;
    };
    const report = (cause: unknown) => {
      if (!abort.signal.aborted) setError(message(cause));
    };
    void detail().catch(report);
    stream.onmessage = (event) => {
      try {
        const parsed = RunEvent.parse(JSON.parse(event.data)) as RunEvent;
        dispatch({ type: "event", event: parsed });
        if (parsed.type === "run.finished") {
          stream.close();
          void detail().then(refresh).catch(report);
        }
      } catch (cause) {
        stream.close();
        report(cause);
      }
    };
    stream.addEventListener("trace-gap", () =>
      dispatch({ type: "notice", id, message: "Earlier events have expired from the bounded trace buffer." }),
    );
    stream.onerror = () => {
      void detail()
        .then((result) => {
          if (abort.signal.aborted) return;
          if (result.run.status !== "running") {
            stream.close();
            dispatch({
              type: "notice",
              id,
              message:
                "The stream is closed. After an API restart or trace expiry, only the stored run and result remain.",
            });
            void refresh().catch(report);
          } else
            dispatch({
              type: "notice",
              id,
              message: "Connection interrupted. Reconnecting to the run trace…",
            });
        })
        .catch(report);
    };
    return () => {
      abort.abort();
      stream.close();
    };
  }, [state.runId, refresh]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const { runId } = await api.start(task);
      dispatch({ type: "select", id: runId });
      await refresh();
    } catch (cause) {
      setError(message(cause));
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const stop = async () => {
    if (!state.runId) return;
    setBusy(true);
    setError(null);
    try {
      await api.stop(state.runId);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const active = state.status === "running" || runs.some((run) => run.status === "running");
  const result = state.detail?.result;
  const totals =
    [...state.events].reverse().find((event) => event.type === "run.finished")?.totals ??
    (state.detail?.run.status !== "running" ? state.detail?.run : null);
  const visible = state.events.filter((event) =>
    tab === "Context"
      ? event.type === "context.supplied"
      : tab === "Tool calls"
        ? event.type.startsWith("tool.")
        : tab === "Raw events"
          ? event.type === "raw"
          : isProblem(event),
  );
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Loom</span>
        <span className="pill">{onBack ? "Session 02" : "Session 01"}</span>
        {onBack && (
          <button type="button" className="secondary" onClick={onBack}>
            Back to workflows
          </button>
        )}
        <span>Agent Console</span>
        <span className="top-note">Controlled tools. Visible execution.</span>
      </header>
      <main className="content">
        <div className="page-heading">
          <div>
            <h1>Understand a solution brief</h1>
            <p className="muted">Follow the agent’s sources, tool calls and validated output.</p>
          </div>
          <span className={`badge ${state.status === "completed" ? "ok" : "warn"}`} role="status">
            {state.status ?? "Ready"}
          </span>
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <div className="console-grid">
          <section className="panel task-panel">
            <h2>Task</h2>
            <label htmlFor="task">What should the agent analyse?</label>
            <textarea
              id="task"
              value={onBack ? (state.detail?.run.task ?? "") : task}
              readOnly={!!onBack}
              maxLength={2000}
              onChange={(e) => setTask(e.target.value)}
              rows={6}
            />
            <div className="actions">
              <button
                type="button"
                disabled={!!onBack || busy || active || !profile || !task.trim()}
                onClick={() => void start()}
              >
                Run analysis
              </button>
              <button
                className="secondary"
                type="button"
                disabled={busy || state.status !== "running"}
                onClick={() => void stop()}
              >
                Stop
              </button>
            </div>
            <p className="small muted">Each run uses your Copilot allowance. One run at a time.</p>
            {profile?.runtime === "scripted" && (
              <p className="notice">Scripted demo: usage counts are simulated; no Copilot calls.</p>
            )}
            <h3>Workspace sources</h3>
            <ul className="source-list">
              {sources.map((source) => (
                <li key={source.id}>
                  <strong>{source.name}</strong>
                  <small>
                    {source.id} · {source.sizeBytes.toLocaleString()} bytes
                  </small>
                </li>
              ))}
            </ul>
            <h3>Permitted tools</h3>
            {profile?.toolNames.map((name) => (
              <code className="tool-name" key={name}>
                {name}
              </code>
            ))}
            <p className="small muted">
              {profile?.clientProfile} profile · {profile?.model ?? "Runtime default model"} · up to{" "}
              {profile?.toolCallBudget ?? 12} tool calls
            </p>
            <label htmlFor="history">Recent runs</label>
            <select
              id="history"
              value={state.runId ?? ""}
              onChange={(e) => {
                if (e.target.value) dispatch({ type: "select", id: e.target.value });
              }}
            >
              <option value="">Select a run</option>
              {runs.map((run) => (
                <option key={run.id} value={run.id}>
                  {new Date(run.startedAt).toLocaleTimeString()} — {run.status}
                </option>
              ))}
            </select>
          </section>
          <section className="panel">
            <h2>Agent activity</h2>
            {state.notice && <p className="notice">{state.notice}</p>}
            <ol className="timeline">
              {state.events
                .filter((event) => !["raw", "assistant.delta", "usage"].includes(event.type))
                .map((event) => (
                  <li className={isProblem(event) ? "problem" : ""} key={event.seq}>
                    <span className="event-meta">
                      {event.seq.toString().padStart(2, "0")} · {event.type}
                    </span>
                    <p>{eventSummary(event)}</p>
                  </li>
                ))}
            </ol>
            {!state.events.length && (
              <div className="empty">
                Run an analysis to see which tools the agent chooses and how Loom validates each action.
              </div>
            )}
            {totals && (
              <div className="metrics">
                <span>{totals.modelCalls} model calls</span>
                <span>{totals.toolCalls} tool calls</span>
                <span>{totals.deniedToolCalls} denied</span>
                <span>
                  {totals.inputTokens.toLocaleString()} input / {totals.outputTokens.toLocaleString()} output
                  tokens
                </span>
              </div>
            )}
          </section>
          <section className="panel result-panel">
            <h2>Result</h2>
            <p className="small muted">Stored run output. This is not accepted context.</p>
            {result ? (
              <>
                <span className="badge ok">Validated and stored · #{result.id}</span>
                {(
                  [
                    ["Actors", "actors"],
                    ["Capabilities", "capabilities"],
                    ["External systems", "externalSystems"],
                    ["Constraints", "constraints"],
                    ["Open questions", "openQuestions"],
                  ] as const
                ).map(([title, key]) => (
                  <div key={key}>
                    <h3>{title}</h3>
                    {result.result[key].length ? (
                      <ul>
                        {result.result[key].map((value) => (
                          <li key={value}>{value}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="small muted">None identified in the sources.</p>
                    )}
                  </div>
                ))}
                <h3>Evidence</h3>
                {result.result.evidence.map((evidence) => (
                  <blockquote key={`${evidence.sourceId}-${evidence.quotation}`}>
                    <p>{evidence.quotation}</p>
                    <cite>{evidence.sourceId}</cite>
                  </blockquote>
                ))}
              </>
            ) : (
              <div className="empty">
                {state.status && state.status !== "running"
                  ? `No analysis was stored. ${state.detail?.run.error ?? `Run ${state.status}.`}`
                  : "The result appears here after Loom validates and stores the agent’s submission."}
              </div>
            )}
          </section>
        </div>
        <section className="panel diagnostics">
          <div className="tabs" role="tablist" aria-label="Run diagnostics">
            {tabs.map((name) => (
              <button
                key={name}
                id={`tab-${name}`}
                type="button"
                role="tab"
                aria-selected={tab === name}
                aria-controls="diagnostic-content"
                onClick={() => setTab(name)}
              >
                {name}
                {name === "Errors" ? ` (${state.events.filter(isProblem).length})` : ""}
              </button>
            ))}
          </div>
          <div
            id="diagnostic-content"
            role="tabpanel"
            aria-labelledby={`tab-${tab}`}
            className="diagnostic-content"
          >
            {visible.length ? (
              visible.map((event) => (
                <details key={event.seq} open={tab === "Context" || tab === "Errors"}>
                  <summary>
                    {event.seq} · {eventSummary(event)}
                  </summary>
                  <pre>{JSON.stringify(event, null, 2)}</pre>
                </details>
              ))
            ) : (
              <p className="muted">No {tab.toLowerCase()} events for this run.</p>
            )}
          </div>
        </section>
        <footer className="small muted">
          Agent traces remain in memory (up to 2,000 events per run and 20 runs). Runs and results are stored
          in PostgreSQL.
        </footer>
      </main>
    </div>
  );
}
