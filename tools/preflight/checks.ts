import type { CopilotCheck } from "@loom/agent-runtime";

export type Status = "pass" | "warn" | "fail";

export type CheckResult = {
  name: string;
  status: Status;
  detail: string;
  /** What to do about a warning or failure. */
  fix?: string;
};

export function checkBun(
  actual: string | undefined,
  required: string,
  packageManager: string,
  engine: string | undefined,
): CheckResult {
  if (!/^\d+\.\d+\.\d+$/.test(required) || packageManager !== `bun@${required}` || engine !== required) {
    return {
      name: "Bun",
      status: "fail",
      detail: "Bun version pins disagree or are invalid",
      fix: "Align .bun-version, packageManager and engines.bun before running the session.",
    };
  }
  return actual === required
    ? { name: "Bun", status: "pass", detail: actual }
    : {
        name: "Bun",
        status: "fail",
        detail: `${actual ?? "not running under Bun"}, but this repository requires Bun ${required}`,
        fix: `Install Bun ${required} and run \`bun run preflight\`.`,
      };
}

export function checkBunPackageManager(userAgent: string | undefined, packageManager: string): CheckResult {
  const required = packageManager.replace(/^bun@/, "");
  const actual = userAgent?.match(/(?:^|\s)bun\/(\S+)/)?.[1];
  if (!actual) {
    return {
      name: "Bun package manager",
      status: "warn",
      detail: "not started through Bun's script runner, package-manager version unknown",
      fix: "Run the checks as `bun run preflight`.",
    };
  }
  return actual === required
    ? { name: "Bun package manager", status: "pass", detail: actual }
    : {
        name: "Bun package manager",
        status: "fail",
        detail: `${actual}, but package.json pins ${required}`,
        fix: `Install Bun ${required} and run \`bun run preflight\`.`,
      };
}

export function checkEnvFile(exists: boolean): CheckResult {
  return exists
    ? { name: ".env.local", status: "pass", detail: "found" }
    : {
        name: ".env.local",
        status: "fail",
        detail: "missing",
        fix: "Run `cp .env.example .env.local` and set DATABASE_URL.",
      };
}

/** Turns the selected storage error into advice without switching databases. */
export function databaseFailure(
  label: string,
  target: string,
  databaseName: string,
  error: { error: string; code?: string },
): CheckResult {
  const base = { name: label, status: "fail" as const, detail: `${target}: ${error.error}` };
  if (target.startsWith("sqlite:"))
    return { ...base, fix: "Check the SQLite file path and folder permissions, then migrate and seed it." };
  switch (error.code) {
    case "ECONNREFUSED":
      return {
        ...base,
        fix: "Start PostgreSQL: `podman start loom-postgres` (on macOS first `podman machine start`). Check the port in DATABASE_URL.",
      };
    case "3D000":
      return {
        ...base,
        fix: `Create the database: \`podman exec loom-postgres createdb -U loom ${databaseName}\``,
      };
    case "28P01":
      return {
        ...base,
        fix: "Check the user and password in DATABASE_URL (local default: loom / loom-dev).",
      };
    default:
      return { ...base, fix: "Check DATABASE_URL and that PostgreSQL is running." };
  }
}

export function checkMigrations(pending: string[]): CheckResult {
  return pending.length === 0
    ? { name: "Migrations", status: "pass", detail: "up to date" }
    : {
        name: "Migrations",
        status: "warn",
        detail: `${pending.length} pending: ${pending.join(", ")}`,
        fix: "Run `bun run db:migrate`.",
      };
}

export type CopilotAssessmentInput = {
  check: CopilotCheck;
  bundledRuntimeVersion: string;
  platform: NodeJS.Platform;
  /** Result of checking the installed CLI, when the bundled runtime was not authenticated. */
  installedCli?: { path: string; check: CopilotCheck };
  compare: (a: string, b: string) => number;
};

/** Interprets the Copilot runtime check, including the macOS keychain case (ADR 0009). */
export function assessCopilot(input: CopilotAssessmentInput): CheckResult[] {
  const { check, bundledRuntimeVersion, platform, installedCli, compare } = input;
  const runtimeDetail = `${check.runtime}${check.runtimeVersion ? `, version ${check.runtimeVersion}` : ""}`;
  const results: CheckResult[] = [];

  if (check.error && !check.runtimeVersion) {
    results.push({
      name: "Copilot runtime",
      status: "fail",
      detail: `${check.runtime}: ${check.error}`,
      fix:
        check.runtime === "bundled with @github/copilot-sdk"
          ? "Reinstall dependencies with `bun install --frozen-lockfile`."
          : "Check LOOM_COPILOT_CLI_PATH points at the Copilot CLI executable (`command -v copilot`).",
    });
    return results;
  }

  const outdated =
    check.runtime !== "bundled with @github/copilot-sdk" &&
    check.runtimeVersion !== undefined &&
    compare(check.runtimeVersion, bundledRuntimeVersion) < 0;
  results.push(
    outdated
      ? {
          name: "Copilot runtime",
          status: "warn",
          detail: `${runtimeDetail} (older than the tested ${bundledRuntimeVersion})`,
          fix: "Update the Copilot CLI (`copilot update`).",
        }
      : { name: "Copilot runtime", status: "pass", detail: runtimeDetail },
  );

  if (check.authenticated) {
    results.push({
      name: "Copilot sign-in",
      status: "pass",
      detail: `${check.login ?? "signed in"} (${check.profile === "production" ? "token, empty mode" : "copilot login, copilot-cli mode"})`,
    });
    return results;
  }

  if (check.profile === "production") {
    results.push({
      name: "Copilot sign-in",
      status: "fail",
      detail: "LOOM_GITHUB_TOKEN is set but not accepted",
      fix: "Use a fine-grained token (github_pat_…) with the Copilot Requests permission, or remove LOOM_GITHUB_TOKEN to use `copilot login`.",
    });
    return results;
  }

  if (platform === "darwin" && installedCli?.check.authenticated) {
    results.push({
      name: "Copilot sign-in",
      status: "fail",
      detail: "the bundled runtime cannot read your macOS keychain login, but the installed Copilot CLI can",
      fix: `Add to .env.local: LOOM_COPILOT_CLI_PATH=${installedCli.path}`,
    });
    return results;
  }

  results.push({
    name: "Copilot sign-in",
    status: "fail",
    detail: "not signed in",
    fix: 'Run `copilot login`, then check with `copilot -p "Reply with the single word OK."`.',
  });
  return results;
}
