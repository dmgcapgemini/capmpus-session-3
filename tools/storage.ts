import { createHash } from "node:crypto";
import { extname } from "node:path";

/** A dedicated sibling evaluation file/server database; never mutate ordinary storage. */
export function evaluationDatabaseUrl(applicationUrl: string): string {
  if (applicationUrl.startsWith("sqlite:")) {
    const extension = extname(applicationUrl);
    return `${applicationUrl.slice(0, -extension.length)}_eval${extension}`;
  }
  const url = new URL(applicationUrl);
  url.pathname = `/loom_s03_eval_${createHash("sha256").update(url.pathname).digest("hex").slice(0, 16)}_test`;
  return url.href;
}

export function isDemoStorage(databaseUrl: string): boolean {
  return databaseUrl.startsWith("sqlite:")
    ? /_demo\.(sqlite|db)$/.test(databaseUrl)
    : new URL(databaseUrl).pathname.endsWith("_demo");
}
