import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const envFile = resolve(import.meta.dirname, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const exclude = ["**/node_modules/**", "**/dist/**"];

// Three kinds of test (ADR 0006): unit, integration against the selected SQLite/PostgreSQL storage, and live Copilot tests.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["{apps,packages,tools}/**/*.test.{ts,tsx}"],
          exclude: [...exclude, "**/*.int.test.*", "**/*.live.test.*"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["{apps,packages,tools}/**/*.int.test.ts"],
          exclude,
          globalSetup: ["tools/test-setup.ts"],
          fileParallelism: false,
        },
      },
      {
        test: {
          name: "live",
          include: ["{apps,packages,tools}/**/*.live.test.ts"],
          exclude,
          testTimeout: 60_000,
        },
      },
    ],
  },
});
