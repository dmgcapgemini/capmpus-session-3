import { readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";
import { SOURCE_ID_PATTERN, type SourceSummary } from "@loom/contracts";
import { z } from "zod";

export const MAX_SOURCE_BYTES = 256_000;

const Manifest = z.object({
  sources: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1).max(120),
      file: z.string().min(1),
      mediaType: z.enum(["text/markdown", "text/plain"]),
    }),
  ),
});

export type SourceContent = SourceSummary & { content: string };

export interface SourceRegistry {
  list(): SourceSummary[];
  /** Content of a declared source, or undefined when the ID is not declared. */
  read(id: string): Promise<SourceContent | undefined>;
}

export class SourceManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceManifestError";
  }
}

type Entry = SourceSummary & { path: string };

const isInside = (dir: string, path: string) => path.startsWith(dir.endsWith(sep) ? dir : dir + sep);

/**
 * Loads the sources declared in `<dir>/sources.json`. Every file must resolve, after following
 * symbolic links, to a regular file inside the directory. Sources are then reachable only by ID.
 */
export async function loadSourceRegistry(dir: string): Promise<SourceRegistry> {
  let root: string;
  try {
    root = await realpath(resolve(dir));
  } catch {
    throw new SourceManifestError(`Sources directory not found: ${dir}`);
  }

  let manifest: z.infer<typeof Manifest>;
  try {
    manifest = Manifest.parse(JSON.parse(await readFile(join(root, "sources.json"), "utf8")));
  } catch (error) {
    const detail = error instanceof z.ZodError ? z.prettifyError(error) : String(error);
    throw new SourceManifestError(`Invalid sources.json in ${dir}: ${detail}`);
  }

  const entries = new Map<string, Entry>();
  for (const [index, source] of manifest.sources.entries()) {
    const label = `source ${index + 1} ("${source.id}")`;
    if (!SOURCE_ID_PATTERN.test(source.id)) {
      throw new SourceManifestError(`${label}: ID must match ${SOURCE_ID_PATTERN}`);
    }
    if (entries.has(source.id)) throw new SourceManifestError(`${label}: duplicate ID`);
    if (isAbsolute(source.file)) throw new SourceManifestError(`${label}: file must be relative`);

    let path: string;
    try {
      path = await realpath(join(root, source.file));
    } catch {
      throw new SourceManifestError(`${label}: file not found: ${source.file}`);
    }
    if (!isInside(root, path))
      throw new SourceManifestError(`${label}: file is outside the sources directory`);

    const info = await stat(path);
    if (!info.isFile()) throw new SourceManifestError(`${label}: not a regular file`);
    if (info.size > MAX_SOURCE_BYTES) {
      throw new SourceManifestError(`${label}: file is larger than ${MAX_SOURCE_BYTES} bytes`);
    }

    entries.set(source.id, {
      id: source.id,
      name: source.name,
      mediaType: source.mediaType,
      sizeBytes: info.size,
      path,
    });
  }

  return {
    list: () => [...entries.values()].map(({ path: _path, ...summary }) => summary),
    read: async (id) => {
      const entry = entries.get(id);
      if (!entry) return undefined;
      // Re-check at read time: the file may have been replaced by a link since loading.
      const current = await realpath(entry.path);
      if (!isInside(root, current)) return undefined;
      const { path: _path, ...summary } = entry;
      return { ...summary, content: await readFile(current, "utf8") };
    },
  };
}
