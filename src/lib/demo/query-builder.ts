/**
 * A tiny supabase-js–compatible query builder used by Local Demo Mode (browser proxy and server).
 * It only records the query; an injected executor decides where it runs.
 */
import type { DemoResult, Filter, QuerySpec, Row } from "./engine";

export type Executor = (spec: QuerySpec) => Promise<DemoResult>;

export class DemoQuery implements PromiseLike<DemoResult> {
  private spec: QuerySpec;

  constructor(table: string, private readonly exec: Executor) {
    this.spec = { table, action: "select", filters: [], order: [], returning: false, mode: "many" };
  }

  select(columns?: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    if (this.spec.action === "select") {
      this.spec.columns = columns ?? "*";
      this.spec.count = opts?.count ?? null;
      this.spec.head = opts?.head ?? false;
    } else {
      this.spec.returning = true;
      this.spec.columns = columns ?? "*";
    }
    return this;
  }
  insert(values: Row | Row[]) { this.spec.action = "insert"; this.spec.values = values; return this; }
  update(values: Row) { this.spec.action = "update"; this.spec.values = values; return this; }
  upsert(values: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.spec.action = "upsert";
    this.spec.values = values;
    if (opts?.onConflict) this.spec.onConflict = opts.onConflict;
    if (opts?.ignoreDuplicates) this.spec.ignoreDuplicates = true;
    return this;
  }
  delete() { this.spec.action = "delete"; return this; }

  private f(filter: Filter) { this.spec.filters.push(filter); return this; }
  eq(col: string, val: unknown) { return this.f({ op: "eq", col, val }); }
  neq(col: string, val: unknown) { return this.f({ op: "neq", col, val }); }
  gt(col: string, val: unknown) { return this.f({ op: "gt", col, val }); }
  gte(col: string, val: unknown) { return this.f({ op: "gte", col, val }); }
  lt(col: string, val: unknown) { return this.f({ op: "lt", col, val }); }
  lte(col: string, val: unknown) { return this.f({ op: "lte", col, val }); }
  is(col: string, val: unknown) { return this.f({ op: "is", col, val }); }
  in(col: string, val: unknown[]) { return this.f({ op: "in", col, val }); }
  or(expr: string) { return this.f({ op: "or", expr }); }
  match(obj: Record<string, unknown>) { for (const [col, val] of Object.entries(obj)) this.eq(col, val); return this; }
  order(col: string, opts?: { ascending?: boolean }) { this.spec.order.push({ col, asc: opts?.ascending ?? true }); return this; }
  limit(n: number) { this.spec.limit = n; return this; }
  single() { this.spec.mode = "single"; return this; }
  maybeSingle() { this.spec.mode = "maybe"; return this; }

  then<R1 = DemoResult, R2 = never>(
    onfulfilled?: ((value: DemoResult) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return this.exec(this.spec).then(onfulfilled, onrejected);
  }
}
