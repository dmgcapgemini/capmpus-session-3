import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  type KnowledgeAnswer,
  type KnowledgeItem,
  KnowledgeSeed,
  type RecordLookup,
  type RetrievalReport,
} from "@loom/contracts";
import { sql } from "kysely";
import type { LoomDatabase } from "./database.ts";
import { isSQLite } from "./sqlite.ts";
import { searchSQLiteDocuments } from "./sqlite-search.ts";

const day = 86400000;

export async function seedKnowledge(db: LoomDatabase, directory: string, now = new Date()) {
  const data = KnowledgeSeed.parse(
    JSON.parse(await readFile(resolve(directory, "knowledge-seed.json"), "utf8")),
  );
  const documents = await Promise.all(
    data.documents.map(async (d) => ({
      id: d.id,
      content: await readFile(resolve(directory, d.file), "utf8"),
      authority: d.authority,
      observed_at: d.observedAt ? new Date(d.observedAt) : new Date(now.getTime() - d.ageDays * day),
      facts: JSON.stringify(d.facts),
    })),
  );
  await db.transaction().execute(async (tx) => {
    for (const d of documents)
      await tx
        .insertInto("knowledge_documents")
        .values(d)
        .onConflict((oc) => oc.column("id").doUpdateSet(d))
        .execute();
    for (const d of data.drivers) {
      await tx
        .insertInto("knowledge_drivers")
        .values({ id: d.id, name: d.name })
        .onConflict((oc) => oc.column("id").doUpdateSet({ name: d.name }))
        .execute();
      const licence = {
        driver_id: d.id,
        category: d.licence,
        observed_at: new Date(now.getTime() - d.ageDays * day),
      };
      await tx
        .insertInto("knowledge_licences")
        .values(licence)
        .onConflict((oc) => oc.column("driver_id").doUpdateSet(licence))
        .execute();
    }
    for (const l of data.locations) {
      await tx
        .insertInto("knowledge_customers")
        .values({ id: l.customerId, name: l.customerName })
        .onConflict((oc) => oc.column("id").doUpdateSet({ name: l.customerName }))
        .execute();
      const row = { id: l.id, customer_id: l.customerId, window_minutes: l.windowMinutes, observed_at: now };
      await tx
        .insertInto("knowledge_locations")
        .values(row)
        .onConflict((oc) => oc.column("id").doUpdateSet(row))
        .execute();
    }
    for (const v of data.vehicles) {
      const row = {
        id: v.id,
        required_licence: v.requiredLicence,
        payload_kg: v.payloadKg,
        observed_at: now,
      };
      await tx
        .insertInto("knowledge_vehicles")
        .values(row)
        .onConflict((oc) => oc.column("id").doUpdateSet(row))
        .execute();
    }
  });
  return {
    documents: documents.length,
    drivers: data.drivers.length,
    locations: data.locations.length,
    vehicles: data.vehicles.length,
  };
}
export async function searchKnowledgeDocuments(
  db: LoomDatabase,
  query: string,
  now: Date,
): Promise<KnowledgeItem[]> {
  const search = (terms: string) =>
    db
      .selectFrom("knowledge_documents")
      .selectAll()
      .where(sql<boolean>`search @@ websearch_to_tsquery('english', ${terms})`)
      .orderBy(sql`ts_rank(search, websearch_to_tsquery('english', ${terms}))`, "desc")
      .orderBy("id")
      .limit(6)
      .execute();
  let rows = isSQLite(db) ? await searchSQLiteDocuments(db, query) : await search(query);
  // Natural-language qualifiers can be absent from a relevant document. Relax only an
  // empty ordinary keyword search; preserve phrases, exclusions and explicit operators.
  const words = query.trim().split(/\s+/u);
  const plainKeywords =
    words.length > 1 &&
    words.every((word) => /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(word) && !/^(and|or|not)$/i.test(word));
  if (!isSQLite(db) && !rows.length && plainKeywords) {
    const partialQuery = words.join(" OR ");
    const matchedTerms = sql<number>`(
      select count(*)::int
      from unnest(tsvector_to_array(to_tsvector('english', ${query}))) as terms(term)
      where term = any(tsvector_to_array(search))
    )`;
    const candidates = await db
      .selectFrom("knowledge_documents")
      .selectAll()
      .select(matchedTerms.as("matched_terms"))
      .where(sql<boolean>`search @@ websearch_to_tsquery('english', ${partialQuery})`)
      .orderBy("matched_terms", "desc")
      .orderBy(sql`ts_rank(search, websearch_to_tsquery('english', ${partialQuery}))`, "desc")
      .orderBy("id")
      .limit(6)
      .execute();
    // Keep the strongest term coverage, not documents sharing only incidental words.
    rows = candidates.filter((row) => row.matched_terms === candidates[0]?.matched_terms);
  }
  return rows.map((r) => ({
    sourceId: r.id,
    evidenceRef: `doc:${r.id}`,
    method: "documents",
    authority: r.authority,
    observedAt: r.observed_at.toISOString(),
    retrievedAt: now.toISOString(),
    content: r.content,
    facts: r.facts,
  }));
}
export async function lookupKnowledgeRecords(
  db: LoomDatabase,
  input: RecordLookup,
  now: Date,
): Promise<KnowledgeItem[]> {
  const retrievedAt = now.toISOString();
  if (input.entity === "driver") {
    const row = await db
      .selectFrom("knowledge_drivers as d")
      .innerJoin("knowledge_licences as l", "l.driver_id", "d.id")
      .select(["d.id", "d.name", "l.category", "l.observed_at"])
      .where("d.id", "=", input.id)
      .executeTakeFirst();
    if (!row) return [];
    return [
      {
        sourceId: "hr",
        evidenceRef: `record:driver:${row.id}`,
        method: "records",
        authority: "authoritative",
        observedAt: new Date(row.observed_at).toISOString(),
        retrievedAt,
        content: `Driver ${row.id}: ${row.name}; licence category ${row.category}.`,
        facts: [{ key: `driver.${row.id}.licence`, value: row.category }],
      },
    ];
  }
  if (input.entity === "location") {
    const row = await db
      .selectFrom("knowledge_locations as l")
      .innerJoin("knowledge_customers as c", "c.id", "l.customer_id")
      .select(["l.id", "l.window_minutes", "l.observed_at", "c.id as customer_id", "c.name as customer_name"])
      .where("l.id", "=", input.id)
      .executeTakeFirst();
    if (!row) return [];
    return [
      {
        sourceId: "erp",
        evidenceRef: `record:location:${row.id}`,
        method: "records",
        authority: "authoritative",
        observedAt: new Date(row.observed_at).toISOString(),
        retrievedAt,
        content: `Location ${row.id}: customer ${row.customer_name} (${row.customer_id}); delivery window ${row.window_minutes} minutes.`,
        facts: [{ key: `location.${row.id}.window_minutes`, value: String(row.window_minutes) }],
      },
    ];
  }
  const row = await db
    .selectFrom("knowledge_vehicles")
    .select(["id", "required_licence", "payload_kg", "observed_at"])
    .where("id", "=", input.id)
    .executeTakeFirst();
  if (!row) return [];
  return [
    {
      sourceId: "fleet-register",
      evidenceRef: `record:vehicle:${row.id}`,
      method: "records",
      authority: "authoritative",
      observedAt: new Date(row.observed_at).toISOString(),
      retrievedAt,
      content: `Vehicle ${row.id}: required licence ${row.required_licence}; payload ${row.payload_kg} kg.`,
      facts: [{ key: `vehicle.${row.id}.licence`, value: row.required_licence }],
    },
  ];
}
export async function createKnowledgeQuery(db: LoomDatabase, runId: string) {
  await db.insertInto("knowledge_queries").values({ run_id: runId }).execute();
}
export async function appendRetrieval(db: LoomDatabase, runId: string, report: RetrievalReport) {
  await db
    .updateTable("knowledge_queries")
    .set({
      reports: isSQLite(db)
        ? sql<string>`json_insert(reports, '$[#]', json(${JSON.stringify(report)}))`
        : sql<string>`reports || ${JSON.stringify([report])}::jsonb`,
    })
    .where("run_id", "=", runId)
    .execute();
}
export async function saveKnowledgeAnswer(db: LoomDatabase, runId: string, answer: KnowledgeAnswer) {
  const row = await db
    .updateTable("knowledge_queries")
    .set({ answer: JSON.stringify(answer) })
    .where("run_id", "=", runId)
    .where("answer", "is", null)
    .returning("run_id")
    .executeTakeFirst();
  if (!row) throw new Error("A knowledge answer is already stored or the query does not exist");
}
export async function getKnowledgeQuery(db: LoomDatabase, runId: string) {
  return db.selectFrom("knowledge_queries").selectAll().where("run_id", "=", runId).executeTakeFirst();
}
export async function listKnowledgeQueries(db: LoomDatabase) {
  return db
    .selectFrom("knowledge_queries as q")
    .innerJoin("agent_runs as r", "r.id", "q.run_id")
    .select(["r.id", "r.task", "r.status", "r.started_at"])
    .orderBy("r.started_at", "desc")
    .limit(50)
    .execute();
}
