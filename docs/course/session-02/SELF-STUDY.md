# Session 2 — Self-study

Allow four hours after completing [the workshop](WORKSHOP.md). Work in your team repository and preserve the supplied tests.


Explain the difference between a workflow version and a semantic context version. Sketch how a later partial-review operation would retain its base context and dependency checks without changing this session’s whole-result review exercise.
## 1. Draw the ownership boundary — 40 minutes

Draw one application-state diagram and mark every durable checkpoint. Annotate the steps controlled by Copilot, Loom and a human. Explain why retrying an invocation does not mean accepting its previous output.

## 2. Add an escalation or timeout rule — 70 minutes

Choose a deadline for awaiting review or an escalation after repeated failures. Persist the deadline or escalation decision so a restart does not reset it. Decide who may act on it and add a test proving that the agent cannot silently accept a proposal. Document any new state and its legal transitions before changing code.

## 3. Extend the retry policy — 70 minutes

Introduce a delay that increases across retries or classify one failure as non-retryable. Persist any next-attempt timestamp. Test the policy with controlled time rather than waiting in a long test. Ensure a restarted API respects the same attempt budget and delay.

## 4. Review and demonstrate — 60 minutes

Add a test for one invalid transition introduced by your extension. Demonstrate recovery, bounded retries and unchanged duplicate protection. Have another team member explain the history without reading the agent conversation. Record one trade-off and one limitation in your review request.

## Expected evidence

Provide the state diagram, policy rationale, test results and a short recorded or written demonstration. Use [the validation checklist](VALIDATION.md) as the baseline; extensions must not bypass human review or make raw traces the source of workflow state.

## Starting the next session

Each session starts from its supplied full starter in a fresh folder. Earlier reference implementations are included; keep your previous work for comparison. Learner improvements and database history do not transfer automatically. Complete local setup before class using [the session-start guide](../../../SESSION-START.md) and [QUICKSTART](../../../QUICKSTART.md). Carrying selected improvements forward is optional work after class.
