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
export function detectKnowledgeConflicts(items: readonly KnowledgeItem[]): Conflict[] {
  // TODO TALLER 3: Detecta los conflictos entre hechos de distintas fuentes.
  void items;
  void normalize;
  return [];
}
