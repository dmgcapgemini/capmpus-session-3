import type { Conflict, KnowledgeItem } from "@loom/contracts";
export const MAX_AGE_MS = { documents: 365 * 86400000, records: 7 * 86400000, fms: 120000 } as const;
export function rejectionReason(item: KnowledgeItem, now: Date): string | null {
  // TODO TALLER 2: Comprueba la autoridad y la vigencia de la evidencia.
  void item;
  void now;
  return null;
}
const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
export function detectKnowledgeConflicts(items: readonly KnowledgeItem[]): Conflict[] {
  // TODO TALLER 3: Detecta los conflictos entre hechos de distintas fuentes.
  void items;
  void normalize;
  return [];
}
