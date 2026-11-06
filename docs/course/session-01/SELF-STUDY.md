# Session 1 — Self-study and continuation

Allow approximately four hours of individual or team work.


Record the Bun version with your test evidence and explain why passing `tsc` is still necessary when Bun executes TypeScript directly.
## 1. Complete and explain the baseline — 60 minutes

Finish any workshop tasks and rerun the checks in [WORKSHOP.md](WORKSHOP.md). Draw the path from task to tool call, validation, storage and displayed result. Label what Copilot controls and what Loom controls.

## 2. Add one bounded capability — 90 minutes

Design a second source-inspection tool, such as returning the headings of a declared document. Give it a typed input, read-only result, permission boundary and controlled failure. Register it explicitly and update its tests and the exposed tool names together. Keep source access behind the registry.

If extending the implementation is premature, write the contract and tests as a design exercise instead. Explain how reusable instructions for choosing the tool would differ from the tool itself.

## 3. Collect evidence — 60 minutes

Document one successful interaction, one failure and one case where a direct structured model call would be preferable. Include the source used, visible tool outcome and corrective action. Use only fictional workshop material in evidence you share.

## 4. Review — 30 minutes

Explain the limits of the current implementation: one active run per API process, process-local trace retention, and no durable review workflow. Record what you would change for restart recovery in Session 2.

## Outcome levels

- Minimum: one model interaction and one controlled tool, with the boundary explained.
- Expected: multiple tools, validated structured output, visible events and a stored analysis.
- Extended: an additional bounded tool, stronger policy tests, or a justified comparison with a direct model call.

## Local storage

Keep the storage route selected during the session. With SQLite, keep application data separate from test files and demonstrate that the stored analysis remains available after restarting the API. The next session supplies a full starter in a fresh folder and supports SQLite by default, with PostgreSQL optional. Retain this session's SQLite files; its records are not transferred automatically.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.
