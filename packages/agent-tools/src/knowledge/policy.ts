import type { Conflict, KnowledgeItem } from "@loom/contracts";
export const MAX_AGE_MS = { documents: 365 * 86400000, records: 7 * 86400000, fms: 120000 } as const;
export function rejectionReason(item: KnowledgeItem, now: Date): string | null {
  if (item.authority === "unverified") return "Source authority is unverified";

  const observedAt = new Date(item.observedAt).getTime();
  if (!Number.isFinite(observedAt)) return "Source observation date is invalid";

  const age = now.getTime() - observedAt;
  if (age < -5000) return "Source observation is in the future";
  if (age > MAX_AGE_MS[item.method]) return "Source observation is stale";

  return null;
}
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
export function detectKnowledgeConflicts(items: readonly KnowledgeItem[]): Conflict[] {
  const factsByKey = new Map<string, Map<string, { evidenceRefs: Set<string>; sourceIds: Set<string> }>>();

  for (const item of items) {
    for (const fact of item.facts) {
      const values = factsByKey.get(fact.key) ?? new Map();
      factsByKey.set(fact.key, values);
      const value = normalize(fact.value);
      const evidence = values.get(value) ?? { evidenceRefs: new Set<string>(), sourceIds: new Set<string>() };
      evidence.evidenceRefs.add(item.evidenceRef);
      evidence.sourceIds.add(item.sourceId);
      values.set(value, evidence);
    }
  }

  return [...factsByKey]
    .sort(([a], [b]) => compareText(a, b))
    .flatMap(([key, values]) => {
      const groups = [...values.values()];
      const hasIndependentDisagreement = groups.some((left, index) =>
        groups
          .slice(index + 1)
          .some((right) =>
            [...left.sourceIds].some((leftSource) =>
              [...right.sourceIds].some((rightSource) => leftSource !== rightSource),
            ),
          ),
      );
      if (!hasIndependentDisagreement) return [];
      return [
        {
          key,
          values: [...values]
            .sort(([a], [b]) => compareText(a, b))
            .map(([value, evidence]) => ({
              value,
              evidenceRefs: [...evidence.evidenceRefs].sort(compareText),
            })),
        },
      ];
    });
}
