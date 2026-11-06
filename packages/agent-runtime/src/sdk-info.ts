import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export type SdkInfo = {
  sdkVersion: string;
  /** Copilot runtime version bundled with, and tested against, this SDK version. */
  bundledRuntimeVersion: string;
};

/** Reads the pinned SDK version and its bundled runtime version from the installed package. */
export function readSdkInfo(): SdkInfo {
  const require = createRequire(import.meta.url);
  let dir = dirname(require.resolve("@github/copilot-sdk"));
  for (;;) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
        name?: string;
        version: string;
        copilotCliVersion?: string;
      };
      if (pkg.name === "@github/copilot-sdk") {
        return { sdkVersion: pkg.version, bundledRuntimeVersion: pkg.copilotCliVersion ?? "unknown" };
      }
    } catch {
      // keep walking up
    }
    const parent = dirname(dir);
    if (parent === dir) throw new Error("Cannot locate @github/copilot-sdk/package.json");
    dir = parent;
  }
}

/** Compares dotted versions numerically, ignoring pre-release suffixes. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    (v.split("-")[0] ?? "").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [pa, pb] = [parse(a), parse(b)];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}
