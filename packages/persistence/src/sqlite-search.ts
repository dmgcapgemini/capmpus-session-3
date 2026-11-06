import { Database as BunDatabase } from "bun:sqlite";
import { type Selectable, sql } from "kysely";
import type { LoomDatabase } from "./database.ts";
import type { Database } from "./schema.ts";

// Common English stop words, matching the classroom queries on PostgreSQL. Operators
// are handled before this filter; source content is never interpreted as a query.
const stopWords = new Set(
  "a an and are as at be been being but by for from had has have he her hers him his i if in into is it its me my no nor not of on or our ours she so than that the their them then there these they this those to too us was we were what when where which who will with you your".split(
    " ",
  ),
);
const ordinaryWord = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;
const quote = (term: string) => `"${term.replaceAll('"', '""')}"`;

/** Translate the workshop's web-search inputs, never interpolate FTS/SQL syntax from input. */
function expression(query: string): string | undefined {
  const tokens = query.match(/"[^"]*"|-?[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*|[^\s]+/gu) ?? [];
  const groups: { included: string[]; excluded: string[] }[] = [{ included: [], excluded: [] }];
  let negate = false;
  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (upper === "OR") {
      if (!groups.at(-1)?.included.length || negate) return;
      groups.push({ included: [], excluded: [] });
      continue;
    }
    if (upper === "AND") continue;
    if (upper === "NOT") {
      if (negate) return;
      negate = true;
      continue;
    }
    const negative = negate || token.startsWith("-");
    negate = false;
    const value = token.startsWith("-") ? token.slice(1) : token;
    const phrase = value.startsWith('"') && value.endsWith('"');
    if (!phrase && !ordinaryWord.test(value)) return;
    const words = (phrase ? value.slice(1, -1).split(/\s+/u) : [value]).map((word) => word.toLowerCase());
    if (!words.some((word) => word && !stopWords.has(word))) continue;
    const term = quote(words.join(" "));
    // Exclusions belong to their OR branch; keep stop words inside quoted phrases
    // so a phrase never collapses into adjacency that the user did not request.
    if (negative) groups.at(-1)?.excluded.push(term);
    else groups.at(-1)?.included.push(term);
  }
  if (negate || groups.some((group) => !group.included.length)) return;
  return groups
    .map(({ included, excluded }) => {
      const positive = `(${included.join(" AND ")})`;
      return excluded.length ? `(${positive} NOT (${excluded.join(" OR ")}))` : positive;
    })
    .join(" OR ");
}

/** Ask the same FTS tokenizer for distinct lexemes: orchard/orchards count once.
 * The small temporary index contains only query text, and never touches persistent data.
 */
function lexemes(words: string[]): string[] {
  const tokenizer = new BunDatabase(":memory:", { create: true, strict: true });
  try {
    tokenizer.run("create virtual table input using fts5(content, tokenize='porter unicode61')");
    tokenizer.run("create virtual table vocabulary using fts5vocab(input, 'row')");
    const insert = tokenizer.prepare("insert into input(content) values (?)");
    try {
      insert.run(words.join(" "));
    } finally {
      insert.finalize();
    }
    const select = tokenizer.prepare("select term from vocabulary order by term");
    try {
      return select.all().map((row) => String(row.term));
    } finally {
      select.finalize();
    }
  } finally {
    tokenizer.close(true);
  }
}

type Document = Selectable<Database["knowledge_documents"]>;

export async function searchSQLiteDocuments(db: LoomDatabase, query: string): Promise<Document[]> {
  const match = expression(query);
  if (!match) return [];
  const exact = await sql<Document>`
    select d.* from knowledge_documents_fts
    join knowledge_documents as d on d.rowid = knowledge_documents_fts.rowid
    where knowledge_documents_fts match ${match}
    order by bm25(knowledge_documents_fts), d.id limit 6
  `.execute(db);
  if (exact.rows.length) return exact.rows;

  // Only empty ordinary keyword searches may relax. Explicit syntax never falls back.
  const words = query.trim().split(/\s+/u);
  if (words.length < 2 || !words.every((word) => ordinaryWord.test(word) && !/^(and|or|not)$/i.test(word)))
    return [];
  const terms = lexemes(words.map((word) => word.toLowerCase()).filter((word) => !stopWords.has(word)));
  if (!terms.length) return [];
  const matches = terms.map(
    (term) => sql`
    select rowid, ${term} as term from knowledge_documents_fts
    where knowledge_documents_fts match ${quote(term)}
  `,
  );
  // Count each distinct keyword once. Apply strongest coverage before the six-result
  // bound, and rank those candidates with the same indexed OR query and stable ID tie.
  const result = await sql<Document>`
    with matches as (${sql.join(matches, sql` union all `)}),
    coverage as (select rowid, count(distinct term) as hits from matches group by rowid)
    select d.* from knowledge_documents_fts
    join knowledge_documents as d on d.rowid = knowledge_documents_fts.rowid
    join coverage as c on c.rowid = d.rowid
    where knowledge_documents_fts match ${terms.map(quote).join(" OR ")}
      and c.hits = (select max(hits) from coverage)
    order by bm25(knowledge_documents_fts), d.id limit 6
  `.execute(db);
  return result.rows;
}
