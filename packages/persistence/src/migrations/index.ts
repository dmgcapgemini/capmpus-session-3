import type { Migration } from "kysely/migration";
import * as s00_0001 from "./s00-0001-loom-meta.ts";
import * as s01_0001 from "./s01-0001-agent-runs.ts";

import * as s02_0001 from "./s02-0001-workflows.ts";

import * as s03_0001 from "./s03-0001-knowledge.ts";

import * as s03_0002 from "./s03-0002-run-diagnostics.ts";

// Forward-only, additive migrations, named sNN-NNNN-description (ADR 0005).
// Register every migration file here; migrations.test.ts fails when one is missing.
export const migrations: Record<string, Migration> = {
  "s00-0001-loom-meta": s00_0001,
  "s01-0001-agent-runs": s01_0001,
  "s02-0001-workflows": s02_0001,
  "s03-0001-knowledge": s03_0001,
  "s03-0002-run-diagnostics": s03_0002,
};
