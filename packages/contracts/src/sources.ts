import { z } from "zod";

export const SOURCE_ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;

export const SourceSummary = z.object({
  id: z.string(),
  name: z.string(),
  mediaType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
});
export type SourceSummary = z.infer<typeof SourceSummary>;

export const ListSourcesResult = z.object({ sources: z.array(SourceSummary) });
export type ListSourcesResult = z.infer<typeof ListSourcesResult>;

export const ReadSourceInput = z.object({
  sourceId: z.string().min(1).max(64).describe("ID of a source returned by list_sources"),
});
export type ReadSourceInput = z.infer<typeof ReadSourceInput>;

export const ReadSourceResult = z.object({
  sourceId: z.string(),
  name: z.string(),
  mediaType: z.string(),
  content: z.string(),
});
export type ReadSourceResult = z.infer<typeof ReadSourceResult>;
