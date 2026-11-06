# 0003 — Web application: Vite and React

- **Status:** accepted
- **Date:** 2026-09-13

## Context

The web application starts as a diagnostic Agent Console (Session 1) and becomes the Loom workspace with an Excalidraw canvas (Session 4 onwards). Excalidraw is a React component. The application is a client-side single-page application talking to Loom's API; it has no server-side rendering or SEO requirements.

## Options

1. **Vite with React 19** (single-page application)
2. Next.js
3. React Router framework mode

## Decision

Use **Vite with React 19 and TypeScript**, as a single-page application.

- In development, Vite proxies `/api` to the Fastify server, so the browser uses one origin and no CORS configuration is needed.
- `@excalidraw/excalidraw` (supports React 19) is added in Session 4, not before.
- No UI component library is imposed; plain CSS modules keep the diagnostic UI readable. Revisit when the Loom workspace shell is built in Session 4.

## Consequences

- A full-stack framework would add a second server and rendering model that the course does not need; Fastify is Loom's only server.
- Fast development feedback and a small configuration surface.
- The production shape (serving the built bundle) is a Session 10 topic.
