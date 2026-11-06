import type { KnowledgeAnswer, KnowledgeItem, RetrievalReport } from "@loom/contracts";
import { describe, expect, it } from "vitest";
import { callTool } from "../testing.ts";
import { isFailure } from "../tools/results.ts";
import { detectKnowledgeConflicts, MAX_AGE_MS, rejectionReason } from "./policy.ts";
import { createKnowledgeTools, KnowledgeRegistry } from "./tools.ts";

const now = new Date("2026-09-15T10:00:00.000Z");
const item = (patch: Partial<KnowledgeItem> = {}): KnowledgeItem => ({
  sourceId: "manual",
  evidenceRef: "doc:manual",
  method: "documents",
  authority: "authoritative",
  observedAt: now.toISOString(),
  retrievedAt: now.toISOString(),
  content: "Driver acknowledgement is required.",
  facts: [{ key: "route.ack", value: "required" }],
  ...patch,
});
function setup(items = [item()]) {
  const reports: RetrievalReport[] = [];
  const answers: KnowledgeAnswer[] = [];
  let time = now;
  const registry = new KnowledgeRegistry([
    { id: "documents", retrieve: async () => items },
    { id: "records", retrieve: async () => [] },
    { id: "fms", retrieve: async () => [] },
  ]);
  const tools = createKnowledgeTools({
    registry,
    now: () => time,
    report: async (r) => {
      reports.push(r);
    },
    save: async (a) => {
      answers.push(a);
    },
    log: () => {},
  });
  const call = (name: string, args: unknown) => {
    const tool = tools.tools.find((t) => t.name === name);
    if (!tool) throw new Error(`Missing tool ${name}`);
    return callTool(tool, args);
  };
  return {
    ...tools,
    registry,
    reports,
    answers,
    call,
    clock: (date: Date) => {
      time = date;
    },
  };
}
const answer = {
  answer: "Acknowledgement is required.",
  uncertainty: "",
  citations: [{ evidenceRef: "doc:manual", quotation: "Driver acknowledgement is required." }],
};
describe("knowledge policy", () => {
  it("accepts exactly the age boundary and authoritative or secondary sources", () => {
    for (const method of ["documents", "records", "fms"] as const)
      expect(
        rejectionReason(
          item({
            method,
            authority: "secondary",
            observedAt: new Date(now.getTime() - MAX_AGE_MS[method]).toISOString(),
          }),
          now,
        ),
      ).toBeNull();
  });
  it("workshop session-03: rejects stale observations for every adapter", () => {
    for (const method of ["documents", "records", "fms"] as const)
      expect(
        rejectionReason(
          item({ method, observedAt: new Date(now.getTime() - MAX_AGE_MS[method] - 1).toISOString() }),
          now,
        ),
      ).toMatch(/stale/);
  });
  it("workshop session-03: rejects unverified and future-dated evidence", () => {
    expect(rejectionReason(item({ authority: "unverified" }), now)).toMatch(/authority/);
    expect(rejectionReason(item({ observedAt: new Date(now.getTime() + 6000).toISOString() }), now)).toMatch(
      /future/,
    );
  });
  it("workshop session-03: detects contradictions while normalizing equivalent values", () => {
    const other = item({
      sourceId: "interview",
      evidenceRef: "doc:interview",
      facts: [{ key: "route.ack", value: "Not required" }],
    });
    expect(detectKnowledgeConflicts([item(), other])).toEqual([
      {
        key: "route.ack",
        values: [
          { value: "not required", evidenceRefs: ["doc:interview"] },
          { value: "required", evidenceRefs: ["doc:manual"] },
        ],
      },
    ]);
    expect(
      detectKnowledgeConflicts([item(), { ...other, facts: [{ key: "route.ack", value: " REQUIRED " }] }]),
    ).toEqual([]);
  });
  it("requires independent sources and deduplicates evidence references", () => {
    const sameSourceDisagreement = item({
      evidenceRef: "doc:manual-copy",
      facts: [{ key: "route.ack", value: "not required" }],
    });
    expect(detectKnowledgeConflicts([item(), sameSourceDisagreement])).toEqual([]);

    const independentSource = item({
      sourceId: "interview",
      evidenceRef: "doc:interview",
      facts: [{ key: "route.ack", value: "not required" }],
    });
    expect(detectKnowledgeConflicts([item(), independentSource, independentSource])).toEqual([
      {
        key: "route.ack",
        values: [
          { value: "not required", evidenceRefs: ["doc:interview"] },
          { value: "required", evidenceRefs: ["doc:manual"] },
        ],
      },
    ]);
  });
});
describe("knowledge tool boundaries", () => {
  it("rejects duplicate adapter registration", () => {
    expect(
      () =>
        new KnowledgeRegistry([
          { id: "documents", retrieve: async () => [] },
          { id: "documents", retrieve: async () => [] },
        ]),
    ).toThrow(/Duplicate/);
  });
  it("workshop session-03: exposes the external tool without SQL or arbitrary HTTP tools", () => {
    expect(setup().tools.map((t) => t.name)).toEqual([
      "search_documents",
      "lookup_records",
      "get_vehicle_status",
      "submit_knowledge_answer",
    ]);
  });
  it("stores exact cited evidence once", async () => {
    const t = setup();
    await t.call("search_documents", { query: "acknowledgement" });
    expect(isFailure(await t.call("submit_knowledge_answer", answer))).toBe(false);
    expect(t.answers[0]?.evidence).toEqual([item()]);
    expect(isFailure(await t.call("submit_knowledge_answer", answer))).toBe(true);
  });
  it("reports storage failure without claiming success and permits a later retry", async () => {
    let saves = 0;
    const capability = createKnowledgeTools({
      registry: new KnowledgeRegistry([{ id: "documents", retrieve: async () => [item()] }]),
      now: () => now,
      report: async () => {},
      log: () => {},
      save: async () => {
        if (++saves === 1) throw new Error("private database detail");
      },
    });
    const call = (name: string, args: unknown) => {
      const tool = capability.tools.find((candidate) => candidate.name === name);
      if (!tool) throw new Error("Tool missing");
      return callTool(tool, args);
    };
    await call("search_documents", { query: "acknowledgement" });
    const failed = await call("submit_knowledge_answer", answer);
    expect(failed).toMatchObject({ resultType: "failure", error: "knowledge-storage-failed" });
    expect(JSON.stringify(failed)).not.toContain("private database detail");
    expect(capability.hasResult()).toBe(false);
    expect(isFailure(await call("submit_knowledge_answer", answer))).toBe(false);
    expect(capability.hasResult()).toBe(true);
    expect(saves).toBe(2);
  });
  it("rejects unseen references and incorrect quotations", async () => {
    const t = setup();
    expect(isFailure(await t.call("submit_knowledge_answer", answer))).toBe(true);
    await t.call("search_documents", { query: "acknowledgement" });
    expect(
      isFailure(
        await t.call("submit_knowledge_answer", {
          ...answer,
          citations: [{ evidenceRef: "doc:manual", quotation: "No acknowledgement is needed" }],
        }),
      ),
    ).toBe(true);
    expect(
      isFailure(
        await t.call("submit_knowledge_answer", {
          ...answer,
          citations: [{ evidenceRef: "doc:manual", quotation: "     " }],
        }),
      ),
    ).toBe(true);
    expect(t.answers).toEqual([]);
  });
  it("workshop session-03: keeps rejected content out of the model response", async () => {
    const t = setup([item({ authority: "unverified", content: "UNTRUSTED PRIVATE CLAIM" })]);
    const response = await t.call("search_documents", { query: "claim" });
    expect(JSON.stringify(response)).not.toContain("UNTRUSTED PRIVATE CLAIM");
    expect(t.reports[0]?.rejected).toHaveLength(1);
    expect(isFailure(await t.call("submit_knowledge_answer", answer))).toBe(true);
  });
  it("workshop session-03: rechecks freshness at answer submission", async () => {
    const t = setup();
    await t.call("search_documents", { query: "acknowledgement" });
    t.clock(new Date(now.getTime() + MAX_AGE_MS.documents + 1));
    expect(isFailure(await t.call("submit_knowledge_answer", answer))).toBe(true);
    expect(t.answers).toEqual([]);
  });
  it("workshop session-03: attaches conflicts even when the answer omits them", async () => {
    const other = item({
      sourceId: "interview",
      evidenceRef: "doc:interview",
      facts: [{ key: "route.ack", value: "not required" }],
    });
    const t = setup([item(), other]);
    await t.call("search_documents", { query: "acknowledgement" });
    await t.call("submit_knowledge_answer", answer);
    expect(t.answers[0]?.conflicts).toHaveLength(1);
  });
  it("records source failure and permits only explicit uncertainty without evidence", async () => {
    const t = setup();
    t.registry.get("documents").retrieve = async () => {
      throw new Error("Connection secret must not leak");
    };
    const response = await t.call("search_documents", { query: "manual" });
    expect(JSON.stringify(response)).not.toContain("secret");
    expect(t.reports[0]?.error).toMatch(/unavailable/);
    expect(
      isFailure(
        await t.call("submit_knowledge_answer", { answer: "Invented fact", uncertainty: "", citations: [] }),
      ),
    ).toBe(true);
    expect(
      isFailure(
        await t.call("submit_knowledge_answer", {
          answer: "",
          uncertainty: "The source is unavailable",
          citations: [],
        }),
      ),
    ).toBe(false);
  });
});
