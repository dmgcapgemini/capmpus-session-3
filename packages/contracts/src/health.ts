import { z } from "zod";

export const HealthResponse = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  database: z.object({
    reachable: z.boolean(),
    schemaVersion: z.string().nullable(),
  }),
});

export type HealthResponse = z.infer<typeof HealthResponse>;
