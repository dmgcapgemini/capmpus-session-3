import { existsSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const envFile = resolve(import.meta.dirname, "../../.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const apiPort = Number(process.env.LOOM_API_PORT ?? 3000);
const webPort = Number(process.env.LOOM_WEB_PORT ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    // The browser talks to one origin; Vite forwards /api to Fastify (ADR 0003).
    proxy: { "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false } },
  },
});
