# 0007 — Streaming events to the browser: Server-Sent Events

- **Status:** accepted
- **Date:** 2026-09-13

## Context

An agent run produces a stream of events (tool requested, tool result, validation failure, denial, completion) that the Agent Console shows live. From Session 2, runs belong to durable workflows, so a browser that reconnects must be able to continue from the last event it saw. Commands from the browser (start run, stop run, accept, reject) are ordinary requests.

## Options

1. **Server-Sent Events** for server-to-browser streams, HTTP requests for commands
2. WebSocket for both directions
3. Polling

## Decision

- **Server-Sent Events** (`text/event-stream`) for every stream, for example `GET /api/agent-runs/:id/events`.
- **HTTP JSON requests** for every command.
- Each event carries a monotonically increasing `id`. The server honours `Last-Event-ID` and replays missed events from the database once runs are persisted (Session 2).
- The server-side SSE writer is a small helper in `apps/api` written directly on Fastify's reply stream, with a periodic heartbeat comment; the browser uses `EventSource`.

## Consequences

- One-way streaming matches the data flow; reconnection and resume are built into the protocol.
- Works through the Vite development proxy and ordinary HTTP infrastructure.
- No SSE plugin dependency: the available Fastify plugin is pre-1.0, and the helper is short enough to read in the workshop.
- If Session 6 co-editing needs low-latency bidirectional messaging, a WebSocket decision will supersede this record for that feature only.
