// The small bun:sqlite surface used by the Session 3 adapter. Runtime is pinned to Bun 1.4.0.
declare module "bun:sqlite" {
  export class Database {
    constructor(filename: string, options?: { create?: boolean; strict?: boolean });
    prepare(sql: string): Statement;
    run(sql: string): void;
    close(throwOnError?: boolean): void;
  }
  export interface Statement {
    readonly columnNames: string[];
    all(...parameters: unknown[]): Record<string, unknown>[];
    run(...parameters: unknown[]): { changes: number; lastInsertRowid: number | bigint };
    iterate(...parameters: unknown[]): IterableIterator<Record<string, unknown>>;
    finalize(): void;
  }
}
