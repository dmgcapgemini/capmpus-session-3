import { expect, it } from "vitest";
import { RunHub } from "./hub.ts";

it("bounds event history, keeps monotonic IDs and ignores events after termination", () => {
  const hub = new RunHub(2);
  hub.create("a");
  for (let i = 0; i < 4; i++) hub.emit("a", { type: "error", message: String(i) });
  expect(hub.get("a")?.events.map((event) => event.seq)).toEqual([3, 4]);
  hub.emit("a", {
    type: "run.finished",
    status: "failed",
    analysisResultId: null,
    error: "x",
    totals: { modelCalls: 0, toolCalls: 0, deniedToolCalls: 0, inputTokens: 0, outputTokens: 0 },
  });
  hub.emit("a", { type: "error", message: "late" });
  expect(hub.get("a")?.seq).toBe(5);
});
