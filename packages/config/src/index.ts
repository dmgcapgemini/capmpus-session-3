import { basename, extname, resolve } from "node:path";
import { z } from "zod";

const sqliteFile = (value: string) =>
  value.startsWith("sqlite:") && /\.(?:sqlite|db)$/.test(value) && !/[?#]/.test(value);
const storageUrl = (value: string) =>
  value.startsWith("sqlite:")
    ? `sqlite:${resolve(import.meta.dirname, "../../..", value.slice(7)).replaceAll("\\", "/")}`
    : value;

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const postgresUrl = z
  .string({ error: "is required" })
  .trim()
  .refine((value) => /^postgres(ql)?:\/\/.+\/[^/?]+/.test(value) || sqliteFile(value), {
    error:
      "must be a PostgreSQL URL with a database name, or sqlite: followed by a .sqlite or .db file (Session 3)",
  });

const port = z.coerce.number().int().min(1).max(65_535);

export const EnvSchema = z.object({
  DATABASE_URL: postgresUrl,
  DATABASE_URL_TEST: postgresUrl.optional(),
  LOOM_FMS_URL: z
    .string()
    .regex(/^http:\/\/127\.0\.0\.1(?::[0-9]+)?\/?$/)
    .default("http://127.0.0.1:3010"),
  LOOM_API_PORT: port.default(3000),
  LOOM_WEB_PORT: port.default(5173),
  LOOM_LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  LOOM_COPILOT_CLI_PATH: optionalText,
  LOOM_GITHUB_TOKEN: optionalText,
  LOOM_MODEL: optionalText,
  LOOM_SOURCES_DIR: z.string().trim().min(1).default("examples/session-03"),
});

export type LoomConfig = {
  knowledge: { fmsUrl: string };
  databaseUrl: string;
  testDatabaseUrl: string;
  api: { port: number; logLevel: z.infer<typeof EnvSchema>["LOOM_LOG_LEVEL"] };
  web: { port: number };
  copilot: { cliPath?: string; gitHubToken?: string; model?: string };
  /** Workspace sources directory, relative to the reference root unless absolute. */
  sources: { dir: string };
};

export class ConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid configuration:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`);
    this.name = "ConfigError";
    this.issues = issues;
  }
}

export type ConfigResult = { ok: true; config: LoomConfig } | { ok: false; issues: string[] };

/** Validates environment variables without throwing. */
export function parseConfig(env: Record<string, string | undefined> = process.env): ConfigResult {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "environment"} ${issue.message}`),
    };
  }
  const e = parsed.data;
  const applicationUrl = storageUrl(e.DATABASE_URL);
  const testUrl = storageUrl(e.DATABASE_URL_TEST ?? deriveTestDatabaseUrl(e.DATABASE_URL));
  if (applicationUrl.startsWith("sqlite:") && applicationUrl === testUrl)
    return { ok: false, issues: ["DATABASE_URL_TEST must use a separate SQLite file from DATABASE_URL."] };
  return {
    ok: true,
    config: {
      knowledge: { fmsUrl: e.LOOM_FMS_URL },
      databaseUrl: applicationUrl,
      testDatabaseUrl: testUrl,
      api: { port: e.LOOM_API_PORT, logLevel: e.LOOM_LOG_LEVEL },
      web: { port: e.LOOM_WEB_PORT },
      copilot: { cliPath: e.LOOM_COPILOT_CLI_PATH, gitHubToken: e.LOOM_GITHUB_TOKEN, model: e.LOOM_MODEL },
      sources: { dir: e.LOOM_SOURCES_DIR },
    },
  };
}

/** Validates environment variables and throws a readable ConfigError when they are invalid. */
export function loadConfig(env: Record<string, string | undefined> = process.env): LoomConfig {
  const result = parseConfig(env);
  if (!result.ok) throw new ConfigError(result.issues);
  return result.config;
}

/** Same server and credentials, database name with "_test" appended. */
export function deriveTestDatabaseUrl(databaseUrl: string): string {
  if (databaseUrl.startsWith("sqlite:")) {
    const extension = extname(databaseUrl);
    const stem = databaseUrl.slice(0, -extension.length).replace(/_test$/, "");
    return `${stem}_test${extension}`;
  }
  const url = new URL(databaseUrl);
  url.pathname = `${url.pathname.replace(/_test$/, "")}_test`;
  return url.toString();
}

/** Database URL safe to print: the password is replaced. */
export function redactDatabaseUrl(databaseUrl: string): string {
  if (databaseUrl.startsWith("sqlite:")) return databaseUrl;
  try {
    const url = new URL(databaseUrl);
    if (url.password) url.password = "*****";
    return url.toString();
  } catch {
    return "(unparseable URL)";
  }
}

/** Database name from a PostgreSQL URL. */
export function databaseName(databaseUrl: string): string {
  if (databaseUrl.startsWith("sqlite:")) return basename(databaseUrl.slice(7));
  return decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
}
