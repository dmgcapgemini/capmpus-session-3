import { rejectionReason } from "@loom/agent-tools";
import type { EvaluationQuestion, KnowledgeQueryDetail } from "@loom/contracts";

const set = (values: string[]) => [...new Set(values)].sort();
const same = (a: string[], b: string[]) => JSON.stringify(set(a)) === JSON.stringify(set(b));
export function scoreKnowledgeQuestion(question: EvaluationQuestion, detail: KnowledgeQueryDetail) {
  const actualAdapters = set(detail.reports.map((r) => r.adapter));
  const conflicts = set(detail.answer?.conflicts.map((c) => c.key) ?? []);
  const rejectedSources = set(detail.reports.flatMap((r) => r.rejected.map((i) => i.sourceId)));
  const failures = detail.reports.filter((r) => r.error).map((r) => ({ adapter: r.adapter, error: r.error }));
  const answer = detail.answer;
  const citedRefs = set(answer?.citations.map((c) => c.evidenceRef) ?? []);
  // FMS references include observation time; a trailing colon declares a fixture prefix.
  const matches = (expected: string, actual: string) =>
    expected.endsWith(":") ? actual.startsWith(expected) : actual === expected;
  const expectedEvidencePresent =
    question.expectedEvidence.every((expected) => citedRefs.some((ref) => matches(expected, ref))) &&
    citedRefs.every((ref) => question.expectedEvidence.some((expected) => matches(expected, ref)));
  const evidenceValid =
    !!answer &&
    (answer.citations.length
      ? answer.citations.every((c) => {
          const item = answer.evidence.find((i) => i.evidenceRef === c.evidenceRef);
          return (
            !!item &&
            !rejectionReason(item, new Date(answer.createdAt)) &&
            item.content.replace(/\s+/g, " ").includes(c.quotation.replace(/\s+/g, " ").trim())
          );
        })
      : !answer.answer.trim() && !!answer.uncertainty.trim());
  const checks = {
    completed: detail.run.status === "completed",
    selection: same(actualAdapters, question.expectedAdapters),
    evidence: evidenceValid && expectedEvidencePresent,
    conflicts: same(conflicts, question.expectedConflictKeys),
    rejections: same(rejectedSources, question.expectedRejectedSources),
    failure: !!failures.length === question.expectedFailure,
  };
  return {
    id: question.id,
    runId: detail.run.id,
    model: detail.run.model,
    clientProfile: detail.run.clientProfile,
    status: detail.run.status,
    error: detail.run.error,
    diagnostics: detail.run.diagnostics ?? null,
    expectedAdapters: question.expectedAdapters,
    expectedEvidence: question.expectedEvidence,
    actualAdapters,
    evidenceRefs: answer?.citations.map((c) => c.evidenceRef) ?? [],
    conflicts,
    rejectedSources,
    failures,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}
