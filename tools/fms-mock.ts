import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildFmsMock, type MockOptions } from "../apps/api/src/knowledge/mock.ts";

const mode = process.argv[2] ?? "normal";
if (!["normal", "stale", "failure", "slow"].includes(mode))
  throw new Error("Mode must be normal, stale, failure or slow");
const port = Number(process.env.LOOM_FMS_PORT ?? 3010);
const delayMs = Number(process.env.LOOM_FMS_DELAY_MS ?? 0);
const ageSeconds = Number(process.env.LOOM_FMS_AGE_SECONDS ?? 0);
if (
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535 ||
  !Number.isFinite(delayMs) ||
  delayMs < 0 ||
  delayMs > 10000 ||
  !Number.isFinite(ageSeconds) ||
  ageSeconds < 0 ||
  ageSeconds > 86400
)
  throw new Error("Invalid mock port, delay or age");
const data = JSON.parse(
  await readFile(resolve(import.meta.dirname, "../examples/session-03/fms-fixtures.json"), "utf8"),
);
const app = buildFmsMock(data, { mode: mode as MockOptions["mode"], delayMs, ageSeconds });
await app.listen({ host: "127.0.0.1", port });
console.log(
  `Simulated FMS ${mode}: http://127.0.0.1:${port}; delay ${delayMs}ms, age ${ageSeconds}s. No external service calls.`,
);
for (const signal of ["SIGINT", "SIGTERM"] as const) process.once(signal, () => void app.close());
