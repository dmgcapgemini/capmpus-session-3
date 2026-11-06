import { KnowledgeRegistry } from "@loom/agent-tools";
import {
  DocumentSearch,
  FleetStatus,
  type KnowledgeItem,
  RecordLookup,
  VehicleLookup,
} from "@loom/contracts";
import { type LoomDatabase, lookupKnowledgeRecords, searchKnowledgeDocuments } from "@loom/persistence";

export function validateFmsUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("FMS must be an HTTP origin on literal 127.0.0.1, without credentials or path");
  return url;
}
export function createKnowledgeRegistry(
  db: LoomDatabase,
  fmsUrl: string,
  now = () => new Date(),
  timeoutMs = 1500,
) {
  const base = validateFmsUrl(fmsUrl);
  return new KnowledgeRegistry([
    {
      id: "documents",
      retrieve: async (raw) => searchKnowledgeDocuments(db, DocumentSearch.parse(raw).query, now()),
    },
    { id: "records", retrieve: async (raw) => lookupKnowledgeRecords(db, RecordLookup.parse(raw), now()) },
    {
      id: "fms",
      retrieve: async (raw) => {
        const { vehicleId } = VehicleLookup.parse(raw);
        const response = await fetch(new URL(`/vehicles/${encodeURIComponent(vehicleId)}`, base), {
          signal: AbortSignal.timeout(timeoutMs),
          redirect: "error",
        });
        if (!response.ok || !response.body) {
          await response.body?.cancel();
          throw new Error("FMS request failed");
        }
        const reader = response.body.getReader();
        let bytes = 0;
        const chunks: Uint8Array[] = [];
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            bytes += value.length;
            if (bytes > 16000) throw new Error("FMS response exceeds limit");
            chunks.push(value);
          }
        } finally {
          await reader.cancel();
        }
        const data = FleetStatus.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
        if (data.vehicleId !== vehicleId) throw new Error("FMS returned a different vehicle");
        return [
          {
            sourceId: "fms",
            evidenceRef: `fms:${vehicleId}:${data.observedAt}`,
            method: "fms",
            authority: "authoritative",
            observedAt: data.observedAt,
            retrievedAt: now().toISOString(),
            content: `Vehicle ${vehicleId} is ${data.status}; compartment temperature is ${data.temperatureC} °C.`,
            facts: [{ key: `vehicle.${vehicleId}.status`, value: data.status }],
          } satisfies KnowledgeItem,
        ];
      },
    },
  ]);
}
