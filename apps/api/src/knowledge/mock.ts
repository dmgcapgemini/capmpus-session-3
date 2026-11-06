import { FleetStatus, VehicleLookup } from "@loom/contracts";
import Fastify from "fastify";

export type MockOptions = {
  mode: "normal" | "stale" | "failure" | "slow";
  delayMs: number;
  ageSeconds: number;
};
export function buildFmsMock(fixtures: unknown, options: MockOptions, now = () => new Date()) {
  const data = FleetStatus.omit({ observedAt: true }).array().parse(fixtures);
  const app = Fastify({ logger: false });
  app.get<{ Params: { vehicleId: string } }>("/vehicles/:vehicleId", async (request, reply) => {
    const parsed = VehicleLookup.safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid vehicle ID" });
    const delay = options.mode === "slow" ? Math.max(2000, options.delayMs) : options.delayMs;
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    if (options.mode === "failure") return reply.code(503).send({ error: "Simulated FMS outage" });
    const vehicle = data.find((v) => v.vehicleId === parsed.data.vehicleId);
    if (!vehicle) return reply.code(404).send({ error: "Unknown vehicle" });
    const age = options.mode === "stale" ? Math.max(600, options.ageSeconds) : options.ageSeconds;
    return { ...vehicle, observedAt: new Date(now().getTime() - age * 1000).toISOString() };
  });
  return app;
}
