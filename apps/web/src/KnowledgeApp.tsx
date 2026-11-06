import type { KnowledgeQueryDetail, KnowledgeQueryList } from "@loom/contracts";
import { useEffect, useState } from "react";
import { api } from "./api.ts";
import { WorkflowApp } from "./WorkflowApp.tsx";

type Query = (typeof KnowledgeQueryList._output.queries)[number];
const message = (cause: unknown) => (cause instanceof Error ? cause.message : String(cause));
export function KnowledgeApp() {
  const [screen, setScreen] = useState<"knowledge" | "workflows">("knowledge");
  const [queries, setQueries] = useState<Query[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<KnowledgeQueryDetail | null>(null);
  const [question, setQuestion] = useState(
    "Compare the operations manual and dispatcher interview: is driver acknowledgement required for route changes after departure?",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (screen !== "knowledge") return;
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const [list, current] = await Promise.all([
          api.knowledgeQueries(abort.signal),
          selected ? api.knowledgeDetail(selected, abort.signal) : Promise.resolve(null),
        ]);
        if (!abort.signal.aborted) {
          setQueries(list.queries);
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
  }, [selected, screen]);
  const choose = (id: string) => {
    setSelected(id);
    setDetail(null);
    setError(null);
  };
  const ask = async () => {
    setBusy(true);
    setError(null);
    try {
      choose((await api.askKnowledge(question)).runId);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  const stop = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.stop(selected);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };
  if (screen === "workflows") return <WorkflowApp onKnowledge={() => setScreen("knowledge")} />;
  const current = detail?.run.id === selected ? detail : null;
  return (
    <div className="shell">
      <header className="topbar">
        <span className="brand">Loom</span>
        <span className="pill">Session 03</span>
        <span>Knowledge access</span>
        <button type="button" className="secondary" onClick={() => setScreen("workflows")}>
          Workflows
        </button>
      </header>
      <main className="content">
        <div className="page-heading">
          <div>
            <h1>Ask the right source</h1>
            <p className="muted">Answers with evidence, source provenance and visible uncertainty.</p>
          </div>
        </div>
        {error && (
          <div className="alert" role="alert">
            {error}
          </div>
        )}
        <div className="workflow-grid">
          <section className="panel">
            <h2>Your question</h2>
            <label htmlFor="knowledge-question">What do you need to know?</label>
            <textarea
              id="knowledge-question"
              rows={6}
              maxLength={2000}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="actions">
              <button
                type="button"
                disabled={busy || !question.trim() || current?.run.status === "running"}
                onClick={() => void ask()}
              >
                Ask Loom
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy || current?.run.status !== "running"}
                onClick={() => void stop()}
              >
                Stop
              </button>
            </div>
            <p className="small muted">
              Normal runs use Copilot. One invocation at a time, shared with workflows.
            </p>
            <h3>Knowledge sources</h3>
            <ul>
              <li>Documents: policies, interviews and agreements</li>
              <li>Records: exact driver, location and vehicle data</li>
              <li>FMS: simulated current availability and temperature</li>
            </ul>
            <p className="small muted">
              Unverified sources are rejected. Maximum age: documents 365 days, records 7 days, FMS 120
              seconds.
            </p>
            <h3>Recent questions</h3>
            <ul className="workflow-list">
              {queries.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    className="secondary"
                    aria-current={selected === q.id ? "true" : undefined}
                    onClick={() => choose(q.id)}
                  >
                    <strong>{q.task}</strong>
                    <small>{q.status}</small>
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel workflow-detail">
            {current ? (
              <>
                <h2>{current.run.task}</h2>
                <span className={`badge ${current.run.status === "completed" ? "ok" : "warn"}`} role="status">
                  {current.run.status}
                </span>
                {current.run.error && <p className="alert">{current.run.error}</p>}
                {current.run.model === "scripted-knowledge-fixture" && (
                  <p className="notice">
                    Scripted demonstration. Source choices are supplied by a fixture; no model calls.
                  </p>
                )}
                <h3>Answer</h3>
                {current.answer ? (
                  <>
                    <p className="knowledge-answer">
                      {current.answer.answer || "Insufficient eligible evidence to answer."}
                    </p>
                    {current.answer.uncertainty && <p className="notice">{current.answer.uncertainty}</p>}
                    <p className="small muted">A knowledge answer is not an approved workflow decision.</p>
                    {current.answer.conflicts.length > 0 && (
                      <div className="alert">
                        <h3>Sources disagree</h3>
                        <p>These conflicts were detected by Loom and remain unresolved.</p>
                        {current.answer.conflicts.map((c) => (
                          <div key={c.key}>
                            <strong>{c.key}</strong>
                            <ul>
                              {c.values.map((v) => (
                                <li key={v.value}>
                                  {v.value} — {v.evidenceRefs.join(", ")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                    <h3>Citations and provenance</h3>
                    {current.answer.citations.map((c) => {
                      const source = current.answer?.evidence.find((e) => e.evidenceRef === c.evidenceRef);
                      return (
                        <blockquote key={`${c.evidenceRef}-${c.quotation}`}>
                          <p>{c.quotation}</p>
                          <cite>
                            {source?.sourceId} · {source?.method} · {source?.authority}
                          </cite>
                          <p className="small muted">
                            Observed {source && new Date(source.observedAt).toLocaleString()} · retrieved{" "}
                            {source && new Date(source.retrievedAt).toLocaleString()}
                          </p>
                          <code className="evidence-ref">{c.evidenceRef}</code>
                        </blockquote>
                      );
                    })}
                    {current.answer.conflicts.length > 0 && (
                      <details>
                        <summary>All eligible evidence behind the conflicts</summary>
                        {current.answer.evidence.map((e) => (
                          <blockquote key={e.evidenceRef}>
                            <p>{e.content}</p>
                            <cite>
                              {e.evidenceRef} · {e.authority}
                            </cite>
                          </blockquote>
                        ))}
                      </details>
                    )}
                  </>
                ) : (
                  <p className="muted">
                    {current.run.status === "running"
                      ? "The agent is choosing sources and gathering evidence…"
                      : "No answer was stored."}
                  </p>
                )}
                {current.run.diagnostics && (
                  <details>
                    <summary>Run diagnostics</summary>
                    <p>
                      Submission attempts: {current.run.diagnostics.submissionAttempts} · Completion recovery
                      attempts: {current.run.diagnostics.recoveries}
                    </p>
                    <ol>
                      {current.run.diagnostics.events.map((event) => (
                        <li key={event.id}>{event.message}</li>
                      ))}
                    </ol>
                    {current.run.diagnostics.assistantMessages.length > 0 && (
                      <>
                        <h3>Model messages — unvalidated</h3>
                        <p>
                          These messages are retained for investigation. They are not validated knowledge
                          answers.
                        </p>
                        {current.run.diagnostics.assistantMessages.map((message) => (
                          <div key={message.id}>
                            {message.partial && (
                              <p className="notice">
                                Partial message: the run ended before the message was complete.
                              </p>
                            )}
                            <pre>{message.content}</pre>
                          </div>
                        ))}
                      </>
                    )}
                    {current.run.diagnostics.truncated && (
                      <p className="notice">
                        This diagnostic record was shortened to stay within storage limits.
                      </p>
                    )}
                  </details>
                )}
                <h3>Source access</h3>
                <ol className="timeline">
                  {current.reports.map((r) => (
                    <li key={r.id}>
                      <strong>{r.adapter}</strong>
                      <p>
                        {r.items.length} eligible items · {r.rejected.length} rejected
                      </p>
                      {r.error && <p className="alert">{r.error}</p>}
                      {r.rejected.map((e) => (
                        <p className="notice" key={e.evidenceRef}>
                          {e.sourceId}: {e.reason}
                        </p>
                      ))}
                      <details>
                        <summary>Retrieval request and evidence references</summary>
                        <pre>
                          {JSON.stringify(
                            { input: r.input, evidence: r.items.map((e) => e.evidenceRef) },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="empty">
                {selected
                  ? "Loading question…"
                  : "Ask a question or select a previous answer to inspect its evidence."}
              </div>
            )}
          </section>
        </div>
        <footer className="small muted">
          Answers and retrieval records survive restarts. Freshness is checked at retrieval and submission.
          Conflicts cover curated fact keys; citations do not prove every sentence is correct.
        </footer>
      </main>
    </div>
  );
}
