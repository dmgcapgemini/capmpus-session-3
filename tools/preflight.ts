import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkCopilot, compareVersions, readSdkInfo } from "@loom/agent-runtime";
import { databaseName, type LoomConfig, parseConfig, redactDatabaseUrl } from "@loom/config";
import { checkDatabase, createDatabase, migrationStatus } from "@loom/persistence";
import {
  assessCopilot,
  type CheckResult,
  checkBun,
  checkBunPackageManager,
  checkEnvFile,
  checkMigrations,
  databaseFailure,
} from "./preflight/checks.ts";

const root = resolve(import.meta.dirname, "..");
const results: CheckResult[] = [];
const print = (result: CheckResult) => {
  const icon = { pass: "✓", warn: "!", fail: "✗" }[result.status];
  console.log(`${icon} ${result.name.padEnd(18)} ${result.detail}`);
  if (result.fix && result.status !== "pass") console.log(`  ${"".padEnd(18)} → ${result.fix}`);
  results.push(result);
};
const section = (title: string) => console.log(`\n${title}`);

console.log("Loom preflight");

section("Toolchain");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
  packageManager: string;
  engines: { bun?: string };
};
print(
  checkBun(
    process.versions.bun,
    readFileSync(resolve(root, ".bun-version"), "utf8").trim(),
    pkg.packageManager,
    pkg.engines.bun,
  ),
);
print(checkBunPackageManager(process.env.npm_config_user_agent, pkg.packageManager));

section("Configuration");
print(checkEnvFile(existsSync(resolve(root, ".env.local"))));
const parsed = parseConfig();
if (parsed.ok) {
  print({ name: "Environment", status: "pass", detail: "valid" });
} else {
  print({
    name: "Environment",
    status: "fail",
    detail: parsed.issues.join("; "),
    fix: "Compare .env.local with .env.example.",
  });
}

if (parsed.ok) {
  await checkDatabases(parsed.config);
  await checkCopilotRuntime(parsed.config);
}

const failures = results.filter((r) => r.status === "fail").length;
const warnings = results.filter((r) => r.status === "warn").length;
console.log(
  failures === 0
    ? `\nAll required checks passed${warnings ? ` (${warnings} warning${warnings > 1 ? "s" : ""})` : ""}.`
    : `\n${failures} check${failures > 1 ? "s" : ""} failed. Fix the items marked ✗ and run \`bun run preflight\` again.`,
);
process.exitCode = failures === 0 ? 0 : 1;

async function checkDatabases(config: LoomConfig): Promise<void> {
  section("Database");
  const storageLabel = config.databaseUrl.startsWith("sqlite:") ? "SQLite" : "PostgreSQL";
  const db = createDatabase(config.databaseUrl, { maxConnections: 1 });
  try {
    const health = await checkDatabase(db);
    if (!health.reachable) {
      print(
        databaseFailure(
          storageLabel,
          redactDatabaseUrl(config.databaseUrl),
          databaseName(config.databaseUrl),
          health,
        ),
      );
      return;
    }
    print({
      name: storageLabel,
      status: "pass",
      detail: `${redactDatabaseUrl(config.databaseUrl)} (server ${health.serverVersion})`,
    });
    const status = await migrationStatus(db);
    print(checkMigrations(status.filter((m) => !m.executedAt).map((m) => m.name)));
  } finally {
    await db.destroy();
  }

  const testDb = createDatabase(config.testDatabaseUrl, { maxConnections: 1 });
  try {
    const health = await checkDatabase(testDb);
    if (health.reachable) {
      print({ name: "Test database", status: "pass", detail: redactDatabaseUrl(config.testDatabaseUrl) });
    } else if (health.code === "3D000") {
      print({
        name: "Test database",
        status: "pass",
        detail: `${databaseName(config.testDatabaseUrl)} will be created by \`bun run test\``,
      });
    } else {
      print({
        ...databaseFailure(
          "Test database",
          redactDatabaseUrl(config.testDatabaseUrl),
          databaseName(config.testDatabaseUrl),
          health,
        ),
        status: "warn",
      });
    }
  } finally {
    await testDb.destroy();
  }
}

async function checkCopilotRuntime(config: LoomConfig): Promise<void> {
  section("Copilot");
  const sdk = readSdkInfo();
  print({
    name: "Copilot SDK",
    status: "pass",
    detail: `@github/copilot-sdk ${sdk.sdkVersion} (bundled runtime ${sdk.bundledRuntimeVersion})`,
  });

  const check = await checkCopilot(config.copilot, { workspaceRoot: root });
  let installedCli: { path: string; check: Awaited<ReturnType<typeof checkCopilot>> } | undefined;
  if (
    !check.authenticated &&
    check.profile === "workshop" &&
    !config.copilot.cliPath &&
    process.platform === "darwin"
  ) {
    const path = findOnPath("copilot");
    if (path) installedCli = { path, check: await checkCopilot({ ...config.copilot, cliPath: path }) };
  }

  for (const result of assessCopilot({
    check,
    bundledRuntimeVersion: sdk.bundledRuntimeVersion,
    platform: process.platform,
    installedCli,
    compare: compareVersions,
  })) {
    print(result);
  }
}

function findOnPath(command: string): string | undefined {
  try {
    return execFileSync("/bin/sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).trim() || undefined;
  } catch {
    return undefined;
  }
}
