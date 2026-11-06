import { describe, expect, it } from "vitest";
import { createRunGuards, type DenialEvent, evaluateToolPolicy } from "./policy.ts";

const toolNames = new Set(["list_sources", "read_source", "submit_analysis_result"]);

describe("evaluateToolPolicy", () => {
  it("allows a registered tool within budget", () => {
    expect(evaluateToolPolicy({ toolNames, toolCalls: 0, hasReadSource: false }, "list_sources")).toEqual({
      allow: true,
    });
  });

  it("denies a tool that is not registered", () => {
    expect(evaluateToolPolicy({ toolNames, toolCalls: 0, hasReadSource: true }, "bash")).toMatchObject({
      allow: false,
      rule: "registered-tools-only",
    });
  });

  it("denies submitting before any source was read", () => {
    expect(
      evaluateToolPolicy({ toolNames, toolCalls: 1, hasReadSource: false }, "submit_analysis_result"),
    ).toMatchObject({ allow: false, rule: "read-before-submit" });
    expect(
      evaluateToolPolicy({ toolNames, toolCalls: 2, hasReadSource: true }, "submit_analysis_result").allow,
    ).toBe(true);
  });

  it("denies calls once the budget is used", () => {
    expect(
      evaluateToolPolicy({ toolNames, toolCalls: 12, hasReadSource: true }, "read_source"),
    ).toMatchObject({
      allow: false,
      rule: "tool-call-budget",
    });
    expect(evaluateToolPolicy({ toolNames, toolCalls: 2, hasReadSource: true }, "read_source", 2).allow).toBe(
      false,
    );
  });
});

describe("run guards", () => {
  const setup = (budget?: number) => {
    const denials: DenialEvent[] = [];
    const guards = createRunGuards({
      toolNames: [...toolNames],
      hasReadSource: () => false,
      onDenied: (denial) => denials.push(denial),
      ...(budget ? { budget } : {}),
    });
    return { guards, denials };
  };

  it("counts only allowed calls and records policy denials", () => {
    const { guards, denials } = setup(2);
    expect(guards.onPreToolUse({ toolName: "list_sources" }).permissionDecision).toBe("allow");
    expect(guards.onPreToolUse({ toolName: "submit_analysis_result" })).toMatchObject({
      permissionDecision: "deny",
      permissionDecisionReason: expect.stringContaining("Read at least one source"),
    });
    expect(guards.onPreToolUse({ toolName: "read_source" }).permissionDecision).toBe("allow");
    expect(guards.onPreToolUse({ toolName: "read_source" }).permissionDecision).toBe("deny");
    expect(guards.toolCalls()).toBe(2);
    expect(denials.map((d) => [d.stage, d.rule])).toEqual([
      ["policy", "read-before-submit"],
      ["policy", "tool-call-budget"],
    ]);
  });

  it("approves permission only for Loom tools and records rejections", () => {
    const { guards, denials } = setup();
    expect(guards.onPermissionRequest({ kind: "custom-tool", toolName: "read_source" } as never)).toEqual({
      kind: "approve-once",
    });
    expect(guards.onPermissionRequest({ kind: "shell", fullCommandText: "ls" } as never)).toMatchObject({
      kind: "reject",
    });
    expect(guards.onPermissionRequest({ kind: "custom-tool", toolName: "other" } as never).kind).toBe(
      "reject",
    );
    expect(denials.map((d) => [d.stage, d.toolName])).toEqual([
      ["permission", "shell"],
      ["permission", "other"],
    ]);
  });
});
