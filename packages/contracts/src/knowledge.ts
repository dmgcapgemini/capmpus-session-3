import { z } from "zod";
import { AgentRun } from "./runs.ts";
export const AdapterId = z.enum(["documents", "records", "fms"]);
export type AdapterId = z.infer<typeof AdapterId>;
export const Authority = z.enum(["unverified", "secondary", "authoritative"]);
export const Fact = z.object({ key: z.string().min(1).max(120), value: z.string().min(1).max(300) });
export const KnowledgeItem = z.object({
  sourceId: z.string().min(1),
  evidenceRef: z.string().min(1),
  method: AdapterId,
  observedAt: z.iso.datetime(),
  retrievedAt: z.iso.datetime(),
  authority: Authority,
  content: z.string().min(1).max(16000),
  facts: z.array(Fact).max(20),
});
export type KnowledgeItem = z.infer<typeof KnowledgeItem>;
export const Conflict = z.object({
  key: z.string(),
  values: z.array(z.object({ value: z.string(), evidenceRefs: z.array(z.string()) })),
});
export type Conflict = z.infer<typeof Conflict>;
export const RetrievalReport = z.object({
  id: z.uuid(),
  adapter: AdapterId,
  input: z.record(z.string(), z.unknown()),
  at: z.iso.datetime(),
  items: z.array(KnowledgeItem),
  rejected: z.array(z.object({ evidenceRef: z.string(), sourceId: z.string(), reason: z.string() })),
  error: z.string().nullable(),
});
export type RetrievalReport = z.infer<typeof RetrievalReport>;
export const CitationInput = z.object({
  evidenceRef: z.string().min(1),
  quotation: z.string().trim().min(5).max(2000),
});
export const SubmitKnowledgeAnswer = z.object({
  answer: z.string().max(6000),
  uncertainty: z.string().max(2000),
  citations: z.array(CitationInput).max(20),
});
export type SubmitKnowledgeAnswer = z.infer<typeof SubmitKnowledgeAnswer>;
export const KnowledgeAnswer = SubmitKnowledgeAnswer.extend({
  evidence: z.array(KnowledgeItem),
  conflicts: z.array(Conflict),
  createdAt: z.iso.datetime(),
});
export type KnowledgeAnswer = z.infer<typeof KnowledgeAnswer>;
export const KnowledgeQueryDetail = z.object({
  run: AgentRun,
  reports: z.array(RetrievalReport),
  answer: KnowledgeAnswer.nullable(),
});
export type KnowledgeQueryDetail = z.infer<typeof KnowledgeQueryDetail>;
export const DocumentSearch = z.object({ query: z.string().trim().min(1).max(200) });
export const RecordLookup = z.object({
  entity: z.enum(["driver", "location", "vehicle"]),
  id: z.string().regex(/^[A-Za-z0-9-]{1,64}$/),
});
export type RecordLookup = z.infer<typeof RecordLookup>;
export const VehicleLookup = z.object({ vehicleId: z.string().regex(/^FT-V-\d{3}$/) });
export const FleetStatus = z.object({
  vehicleId: VehicleLookup.shape.vehicleId,
  status: z.enum(["available", "maintenance", "on-route"]),
  temperatureC: z.number().min(-30).max(60),
  observedAt: z.iso.datetime(),
});
export type FleetStatus = z.infer<typeof FleetStatus>;
export const KnowledgeSeed = z.object({
  documents: z.array(
    z.object({
      id: z.string(),
      file: z.string().regex(/^[a-z0-9-]+\.md$/),
      authority: Authority,
      ageDays: z.number().nonnegative(),
      observedAt: z.iso.datetime().optional(),
      facts: z.array(Fact),
    }),
  ),
  drivers: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      licence: z.enum(["B", "C1", "C"]),
      ageDays: z.number().nonnegative(),
    }),
  ),
  locations: z.array(
    z.object({
      id: z.string(),
      customerId: z.string(),
      customerName: z.string(),
      windowMinutes: z.number().int().positive(),
    }),
  ),
  vehicles: z.array(
    z.object({
      id: z.string(),
      requiredLicence: z.enum(["B", "C1", "C"]),
      payloadKg: z.number().int().positive(),
    }),
  ),
});
export const EvaluationQuestion = z.object({
  id: z.string(),
  question: z.string(),
  expectedAdapters: z.array(AdapterId),
  calls: z.array(z.object({ adapter: AdapterId, input: z.record(z.string(), z.unknown()) })),
  expectedEvidence: z.array(z.string()).default([]),
  expectedConflictKeys: z.array(z.string()).default([]),
  expectedRejectedSources: z.array(z.string()).default([]),
  expectedFailure: z.boolean().default(false),
  fmsMode: z.enum(["normal", "stale", "failure", "slow"]).default("normal"),
});
export type EvaluationQuestion = z.infer<typeof EvaluationQuestion>;
export const KnowledgeQueryList = z.object({
  queries: z.array(
    z.object({ id: z.uuid(), task: z.string(), status: z.string(), startedAt: z.iso.datetime() }),
  ),
});
