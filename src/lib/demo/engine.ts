/**
 * Local Demo Mode — in-memory database engine.
 *
 * ⚠️  This is a SIMULATION used only when no Supabase backend is configured. It is NOT a security
 * boundary: the "row level security" below only exists so the demo behaves like the real app
 * (e.g. general users cannot see other people's notifications). Nothing here is persisted.
 *
 * The engine understands the small PostgREST subset the app uses (select / insert / update /
 * upsert / delete with eq, neq, gt(e), lt(e), is, in, or, order, limit, single, maybeSingle and
 * exact counts) and mirrors the database triggers from drizzle/migrations/0000_*.sql.
 *
 * It has no imports from the rest of the app, so it can run in Node (server) and tests alike.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export type Filter =
  | { op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "is"; col: string; val: unknown }
  | { op: "in"; col: string; val: unknown[] }
  | { op: "or"; expr: string };

export type QuerySpec = {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  columns?: string;
  filters: Filter[];
  order: { col: string; asc: boolean }[];
  limit?: number;
  values?: Row | Row[];
  onConflict?: string;
  ignoreDuplicates?: boolean;
  count?: "exact" | "planned" | "estimated" | null;
  head?: boolean;
  /** `.select()` was chained after a mutation, so the affected rows are returned. */
  returning: boolean;
  mode: "many" | "single" | "maybe";
};

export type DemoError = { message: string; code?: string; details?: string | null; hint?: string | null };
export type DemoResult = { data: unknown; error: DemoError | null; count: number | null };
export type Ctx = { viewer: string | null; admin?: boolean };

export type SeedTime = { $offsetMs: number } | { $todayPlusDays: number };
export type SeedTableInput = { table: string; rows: Record<string, unknown>[] };

const UNIQUE: Record<string, string[]> = {
  votes: ["user_id", "problem_id"],
  saved_items: ["user_id", "item_type", "item_id"],
  blocks: ["blocker_id", "blocked_id"],
  survey_responses: ["survey_id", "respondent_id"],
  user_roles: ["user_id", "role"],
  topic_follows: ["user_id", "topic"],
};
const PK: Record<string, string> = {
  profile_private: "user_id",
  founder_profiles: "user_id",
  investor_profiles: "user_id",
  general_profiles: "user_id",
};
const TABLES = [
  "profiles", "profile_private", "user_roles", "founder_profiles", "investor_profiles", "general_profiles", "consents",
  "problems", "comments", "votes", "saved_items", "topic_follows", "startups", "milestones", "documents", "surveys",
  "survey_questions", "survey_responses", "ai_analyses", "connections", "messages", "blocks", "notifications", "reports",
  "verification_records", "audit_logs",
] as const;

const nowIso = () => new Date().toISOString();
const uuid = () => (globalThis.crypto as Crypto).randomUUID();

function defaults(table: string): Row {
  const base: Row = { id: uuid(), created_at: nowIso() };
  switch (table) {
    case "profiles": return { created_at: nowIso(), updated_at: nowIso(), is_public: true, notification_prefs: { email: true, inapp: true }, avatar_url: null, bio: null, location: null };
    case "profile_private": return { updated_at: nowIso(), phone: null, email: null };
    case "founder_profiles": return { updated_at: nowIso(), skills: [], industry_interests: [], verification_status: "pending", industry: null, linkedin_url: null, startup_experience: null, startup_status: null };
    case "investor_profiles": return { updated_at: nowIso(), investment_interests: [], preferred_industries: [], preferred_stages: [], verification_status: "pending", investor_type: null, investment_min: null, investment_max: null, firm_name: null, professional_profile: null, website: null };
    case "general_profiles": return { updated_at: nowIso(), interests: [] };
    case "problems": return { ...base, updated_at: nowIso(), upvote_count: 0, comment_count: 0, tags: [], location: null, who_faces: null, frequency: null, image_url: null };
    case "startups": return { ...base, updated_at: nowIso(), stage: "idea", is_public: true, team: [], validation_score: null, logo_url: null, tagline: null, problem_id: null, problem: null, solution: null, description: null, industry: null, business_model: null, target_users: null, location: null, website: null, funding_requirement: null, market_info: null };
    case "milestones": return { ...base, status: "planned", description: null, due_date: null };
    case "documents": return { ...base, is_private: true };
    case "surveys": return { ...base, status: "draft", response_count: 0, target_audience: {}, description: null, startup_id: null, problem_id: null, published_at: null };
    case "survey_questions": return { id: uuid(), options: [], required: true };
    case "survey_responses": return { ...base, answers: {} };
    case "connections": return { ...base, status: "pending", message: null, startup_id: null, responded_at: null };
    case "messages": return { ...base, read_at: null };
    case "notifications": return { ...base, body: null, link: null, read_at: null };
    case "reports": return { ...base, status: "open", details: null };
    case "verification_records": return { ...base, status: "pending", ownership_attestation: false, organization: null, professional_reference: null, notes: null, submitted_at: null, reviewed_at: null, legal_name: null, date_of_birth: null, legal_company_name: null, company_registration: null, startup_id: null, investor_type: null, professional_role: null };
    case "audit_logs": return { ...base, metadata: {}, target_type: null, target_id: null };
    case "ai_analyses": return { ...base };
    case "comments": return { ...base, parent_id: null };
    default: return base;
  }
}

function clone<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}

function cmp(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // nulls last when ascending (Postgres default)
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

/** Splits a PostgREST `or(...)` expression on top-level commas. */
function splitTop(expr: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of expr) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function likeToRegex(pattern: string): RegExp {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${esc}$`, "i");
}

function evalTerm(term: string, row: Row): boolean {
  const t = term.trim();
  const group = /^(and|or)\((.*)\)$/s.exec(t);
  if (group) {
    const parts = splitTop(group[2]!).map((p) => evalTerm(p, row));
    return group[1] === "and" ? parts.every(Boolean) : parts.some(Boolean);
  }
  const first = t.indexOf("."), second = t.indexOf(".", first + 1);
  if (first < 0 || second < 0) throw new Error(`Unsupported filter expression: ${t}`);
  const col = t.slice(0, first), op = t.slice(first + 1, second), raw = t.slice(second + 1);
  const cell = row[col];
  switch (op) {
    case "eq": return String(cell) === raw;
    case "neq": return String(cell) !== raw;
    case "is": return raw === "null" ? cell == null : String(cell) === raw;
    case "ilike":
    case "like": return cell != null && likeToRegex(raw).test(String(cell));
    case "gte": return cmp(cell, raw) >= 0;
    case "lte": return cmp(cell, raw) <= 0;
    default: throw new Error(`Unsupported filter operator in or(): ${op}`);
  }
}

function matches(row: Row, filters: Filter[]): boolean {
  for (const f of filters) {
    if (f.op === "or") { if (!evalTerm(`or(${f.expr})`, row)) return false; continue; }
    const cell = row[f.col] ?? null;
    switch (f.op) {
      case "eq": if (cell !== (f.val ?? null)) return false; break;
      case "neq": if (cell === (f.val ?? null)) return false; break;
      case "is": if (cell !== (f.val ?? null)) return false; break;
      case "gt": if (!(cmp(cell, f.val) > 0) || cell == null) return false; break;
      case "gte": if (!(cmp(cell, f.val) >= 0) || cell == null) return false; break;
      case "lt": if (!(cmp(cell, f.val) < 0) || cell == null) return false; break;
      case "lte": if (!(cmp(cell, f.val) <= 0) || cell == null) return false; break;
      case "in": if (!f.val.includes(cell)) return false; break;
    }
  }
  return true;
}

function project(row: Row, columns: string | undefined): Row {
  if (!columns || columns.trim() === "*" || columns.trim() === "") return clone(row);
  const out: Row = {};
  for (const c of columns.split(",").map((x) => x.trim()).filter(Boolean)) {
    if (c === "*") Object.assign(out, clone(row));
    else out[c] = clone(row[c] ?? null);
  }
  return out;
}

class RlsError extends Error {
  code = "42501";
}

export class DemoDb {
  tables: Record<string, Row[]> = {};
  /** When true triggers fire; the seed loader keeps them on to match the SQL seed behaviour. */
  constructor(seed?: SeedTableInput[]) {
    for (const t of TABLES) this.tables[t] = [];
    if (seed) this.load(seed);
  }

  private load(seed: SeedTableInput[]) {
    const ctx: Ctx = { viewer: null, admin: true };
    const now = Date.now();
    const resolveTime = (v: unknown): unknown => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        const o = v as Record<string, unknown>;
        if (typeof o["$offsetMs"] === "number") return new Date(now + (o["$offsetMs"] as number)).toISOString();
        if (typeof o["$todayPlusDays"] === "number") return new Date(now + (o["$todayPlusDays"] as number) * 86400e3).toISOString().slice(0, 10);
      }
      return v;
    };
    for (const { table, rows } of seed) {
      for (const raw of rows) {
        const row: Row = {};
        for (const [k, v] of Object.entries(raw)) row[k] = resolveTime(v);
        // Optional-seed semantics: skip rows that already exist (WHERE NOT EXISTS / ON CONFLICT DO NOTHING).
        const pk = PK[table] ?? "id";
        if (row[pk] != null && this.tables[table]!.some((r) => r[pk] === row[pk])) continue;
        if (table === "startups" && this.tables["startups"]!.some((r) => r["founder_id"] === row["founder_id"] && String(r["name"]).toLowerCase() === String(row["name"]).toLowerCase())) continue;
        this.insertRow(table, row, ctx);
      }
    }
  }

  // ---------------------------------------------------------------- helpers
  private hasRole(user: string | null, role: string): boolean {
    return !!user && this.tables["user_roles"]!.some((r) => r["user_id"] === user && r["role"] === role);
  }
  private connection(id: string) { return this.tables["connections"]!.find((c) => c["id"] === id); }
  private startup(id: string | null) { return id ? this.tables["startups"]!.find((s) => s["id"] === id) : undefined; }
  private survey(id: string) { return this.tables["surveys"]!.find((s) => s["id"] === id); }
  private canViewStartup(id: string | null, v: string | null) {
    const s = this.startup(id);
    return !!s && (s["is_public"] || s["founder_id"] === v);
  }
  private canViewSurvey(id: string, v: string | null) {
    const s = this.survey(id);
    return !!s && (s["status"] !== "draft" || s["founder_id"] === v);
  }
  private isConnected(a: string | null, b: string | null) {
    return this.tables["connections"]!.some((c) => c["status"] === "accepted" && ((c["requester_id"] === a && c["recipient_id"] === b) || (c["requester_id"] === b && c["recipient_id"] === a)));
  }
  private isBlockedBetween(a: string, b: string) {
    return this.tables["blocks"]!.some((x) => (x["blocker_id"] === a && x["blocked_id"] === b) || (x["blocker_id"] === b && x["blocked_id"] === a));
  }
  private isVerifiedInvestor(u: string | null) {
    return this.tables["investor_profiles"]!.some((p) => p["user_id"] === u && p["verification_status"] === "verified");
  }
  private notify(user: string | null, type: string, title: string, body: string | null, link: string | null) {
    if (!user) return;
    this.tables["notifications"]!.push({ ...defaults("notifications"), user_id: user, type, title, body, link });
  }

  rpc(name: string, args: Row, ctx: Ctx): DemoResult {
    if (name === "has_role") {
      return { data: this.hasRole(args["_user_id"] ?? null, String(args["_role"])), error: null, count: null };
    }
    void ctx;
    return { data: null, error: { message: `Local Demo Mode does not implement rpc("${name}")` }, count: null };
  }

  // ---------------------------------------------------------------- simulated RLS
  private canRead(table: string, row: Row, v: string | null): boolean {
    const mod = this.hasRole(v, "moderator");
    switch (table) {
      case "profiles": return !!row["is_public"] || row["id"] === v;
      case "profile_private": case "consents": case "audit_logs": case "verification_records":
      case "saved_items": case "topic_follows": return row["user_id"] === v;
      case "notifications": return row["user_id"] === v;
      case "blocks": return row["blocker_id"] === v;
      case "votes": return row["user_id"] === v;
      case "user_roles": return row["user_id"] === v || mod;
      case "founder_profiles": case "investor_profiles": case "general_profiles": {
        if (row["user_id"] === v || mod) return true;
        const p = this.tables["profiles"]!.find((x) => x["id"] === row["user_id"]);
        if (p && (p["is_public"] || p["id"] === v)) return true;
        return table === "founder_profiles" && this.tables["startups"]!.some((s) => s["founder_id"] === row["user_id"] && this.canViewStartup(s["id"], v));
      }
      case "problems": return true;
      case "comments": return this.tables["problems"]!.some((p) => p["id"] === row["problem_id"]);
      case "startups": return !!row["is_public"] || row["founder_id"] === v;
      case "milestones": return this.canViewStartup(row["startup_id"], v);
      case "documents": {
        if (row["owner_id"] === v) return true;
        if (this.hasRole(v, "general_user")) return false;
        return (!row["is_private"] && this.canViewStartup(row["startup_id"], v)) || (this.isVerifiedInvestor(v) && this.isConnected(v, row["owner_id"]));
      }
      case "surveys": return row["status"] !== "draft" || row["founder_id"] === v;
      case "survey_questions": return this.canViewSurvey(row["survey_id"], v);
      case "survey_responses": return row["respondent_id"] === v || this.survey(row["survey_id"])?.["founder_id"] === v;
      case "ai_analyses": {
        const t = row["subject_type"], id = row["subject_id"];
        if (t === "problem") return this.tables["problems"]!.some((p) => p["id"] === id);
        if (t === "startup") return this.canViewStartup(id, v);
        if (t === "survey") return this.canViewSurvey(id, v);
        return false;
      }
      case "connections": return row["requester_id"] === v || row["recipient_id"] === v;
      case "messages": { const c = this.connection(row["connection_id"]); return !!c && (c["requester_id"] === v || c["recipient_id"] === v); }
      case "reports": return row["reporter_id"] === v || mod;
      default: return false;
    }
  }

  /** Row-level USING predicate for UPDATE / DELETE (in addition to visibility). */
  private canModify(table: string, row: Row, v: string | null): boolean {
    const mod = this.hasRole(v, "moderator");
    switch (table) {
      case "profiles": return row["id"] === v;
      case "profile_private": case "founder_profiles": case "investor_profiles": case "general_profiles":
      case "saved_items": case "topic_follows": case "notifications": return row["user_id"] === v;
      case "problems": return row["author_id"] === v;
      case "comments": return row["author_id"] === v;
      case "votes": return row["user_id"] === v;
      case "blocks": return row["blocker_id"] === v;
      case "startups": return row["founder_id"] === v;
      case "milestones": return this.startup(row["startup_id"])?.["founder_id"] === v;
      case "documents": return row["owner_id"] === v;
      case "surveys": return row["founder_id"] === v;
      case "survey_questions": return this.survey(row["survey_id"])?.["founder_id"] === v;
      case "connections": return row["recipient_id"] === v && row["status"] === "pending";
      case "messages": { const c = this.connection(row["connection_id"]); return !!c && (c["requester_id"] === v || c["recipient_id"] === v); }
      case "reports": return mod;
      case "verification_records": return row["user_id"] === v && (this.hasRole(v, "investor") || this.hasRole(v, "founder")) && !this.hasRole(v, "general_user");
      default: return false;
    }
  }

  /** WITH CHECK predicate for INSERT (and the new row of an UPDATE). */
  private canInsert(table: string, row: Row, v: string | null): boolean {
    if (!v) return false;
    const founder = this.hasRole(v, "founder"), investor = this.hasRole(v, "investor"), general = this.hasRole(v, "general_user");
    switch (table) {
      case "profiles": return row["id"] === v;
      case "profile_private": case "general_profiles": case "consents": case "audit_logs": case "saved_items": case "topic_follows": case "votes":
        return row["user_id"] === v;
      case "founder_profiles": return row["user_id"] === v && founder;
      case "investor_profiles": return row["user_id"] === v && investor;
      case "problems": return row["author_id"] === v;
      case "comments": return row["author_id"] === v;
      case "blocks": return row["blocker_id"] === v;
      case "startups": return row["founder_id"] === v && founder;
      case "milestones": return this.startup(row["startup_id"])?.["founder_id"] === v;
      case "documents": return row["owner_id"] === v && this.startup(row["startup_id"])?.["founder_id"] === v;
      case "surveys": return row["founder_id"] === v && (founder || general) && (!row["startup_id"] || (founder && this.startup(row["startup_id"])?.["founder_id"] === v));
      case "survey_questions": return this.survey(row["survey_id"])?.["founder_id"] === v;
      case "survey_responses": return row["respondent_id"] === v && this.canViewSurvey(row["survey_id"], v) && this.survey(row["survey_id"])?.["status"] === "published";
      case "connections": return row["requester_id"] === v && row["requester_id"] !== row["recipient_id"] && !this.isBlockedBetween(row["requester_id"], row["recipient_id"]) && (founder || investor) && !general;
      case "messages": {
        const c = this.connection(row["connection_id"]);
        return row["sender_id"] === v && !!c && c["status"] === "accepted" && (c["requester_id"] === v || c["recipient_id"] === v) && !this.isBlockedBetween(c["requester_id"], c["recipient_id"]) && String(row["body"] ?? "").length >= 1 && String(row["body"]).length <= 2000;
      }
      case "reports": return row["reporter_id"] === v;
      case "verification_records": return row["user_id"] === v && (founder || investor) && !general;
      default: return false;
    }
  }

  // ---------------------------------------------------------------- mutations + triggers
  private checkUnique(table: string, row: Row, ignoreIdx = -1): boolean {
    const keys = UNIQUE[table];
    const pk = PK[table] ?? "id";
    return !this.tables[table]!.some((r, i) => i !== ignoreIdx && ((keys && keys.every((k) => r[k] === row[k])) || (row[pk] != null && r[pk] === row[pk])));
  }

  private insertRow(table: string, input: Row, ctx: Ctx): Row {
    const row: Row = { ...defaults(table), ...clone(input) };
    for (const k of Object.keys(row)) if (row[k] === undefined) delete row[k];
    if (!ctx.admin && !this.canInsert(table, row, ctx.viewer)) {
      throw new RlsError(`new row violates row-level security policy for table "${table}"`);
    }
    if (!this.checkUnique(table, row)) {
      const e = new Error(`duplicate key value violates unique constraint on "${table}"`) as Error & { code: string };
      e.code = "23505";
      throw e;
    }
    this.tables[table]!.push(row);
    this.afterInsert(table, row);
    return row;
  }

  private afterInsert(table: string, row: Row) {
    if (table === "votes") {
      const p = this.tables["problems"]!.find((x) => x["id"] === row["problem_id"]);
      if (p) p["upvote_count"] = (p["upvote_count"] ?? 0) + 1;
    } else if (table === "comments") {
      const p = this.tables["problems"]!.find((x) => x["id"] === row["problem_id"]);
      if (p) {
        p["comment_count"] = (p["comment_count"] ?? 0) + 1;
        if (p["author_id"] !== row["author_id"]) this.notify(p["author_id"], "comment", "New comment on your problem", String(p["title"]).slice(0, 80), `/problems/${row["problem_id"]}`);
      }
    } else if (table === "connections") {
      const name = this.tables["profiles"]!.find((x) => x["id"] === row["requester_id"])?.["full_name"];
      this.notify(row["recipient_id"], "connection_request", "New connection request", `${name ?? "Someone"} wants to connect with you`, "/connections");
    } else if (table === "survey_responses") {
      const s = this.survey(row["survey_id"]);
      if (s) {
        s["response_count"] = (s["response_count"] ?? 0) + 1;
        this.notify(s["founder_id"], "survey_response", "New survey response", s["title"], `/surveys/${row["survey_id"]}`);
      }
    } else if (table === "verification_records") {
      this.syncVerification(row);
    } else if (table === "messages") {
      const c = this.connection(row["connection_id"]);
      if (c) {
        const other = c["requester_id"] === row["sender_id"] ? c["recipient_id"] : c["requester_id"];
        const name = this.tables["profiles"]!.find((x) => x["id"] === row["sender_id"])?.["full_name"];
        const link = `/messages/${row["connection_id"]}`;
        const pending = this.tables["notifications"]!.some((n) => n["user_id"] === other && n["type"] === "message" && n["read_at"] == null && n["link"] === link);
        if (!pending) this.notify(other, "message", `New message from ${name ?? "a connection"}`, String(row["body"]).slice(0, 80), link);
      }
    }
  }

  private syncVerification(row: Row) {
    for (const t of ["investor_profiles", "founder_profiles"]) {
      for (const p of this.tables[t]!) if (p["user_id"] === row["user_id"]) p["verification_status"] = row["status"];
    }
  }

  private beforeUpdate(table: string, oldRow: Row, newRow: Row) {
    if (table === "connections" && newRow["status"] !== oldRow["status"]) {
      newRow["responded_at"] = nowIso();
      if (newRow["status"] === "accepted") {
        const name = this.tables["profiles"]!.find((x) => x["id"] === newRow["recipient_id"])?.["full_name"];
        this.notify(newRow["requester_id"], "connection_accepted", "Connection accepted", `${name ?? "Someone"} accepted your request. You can now message.`, "/messages");
      }
    }
    if (table === "surveys" && newRow["status"] === "published" && oldRow["status"] !== "published") {
      newRow["published_at"] = nowIso();
      for (const r of this.tables["user_roles"]!.filter((x) => x["role"] === "general_user").slice(0, 200)) {
        this.notify(r["user_id"], "survey_available", "New survey available", newRow["title"], `/surveys/${newRow["id"]}`);
      }
    }
  }

  private afterDelete(table: string, row: Row) {
    const drop = (t: string, pred: (r: Row) => boolean) => { this.tables[t] = this.tables[t]!.filter((r) => !pred(r)); };
    if (table === "votes") {
      const p = this.tables["problems"]!.find((x) => x["id"] === row["problem_id"]);
      if (p) p["upvote_count"] = Math.max((p["upvote_count"] ?? 0) - 1, 0);
    } else if (table === "comments") {
      const p = this.tables["problems"]!.find((x) => x["id"] === row["problem_id"]);
      if (p) p["comment_count"] = Math.max((p["comment_count"] ?? 0) - 1, 0);
    } else if (table === "problems") {
      drop("comments", (r) => r["problem_id"] === row["id"]);
      drop("votes", (r) => r["problem_id"] === row["id"]);
      for (const t of ["startups", "surveys"]) for (const r of this.tables[t]!) if (r["problem_id"] === row["id"]) r["problem_id"] = null;
    } else if (table === "startups") {
      drop("milestones", (r) => r["startup_id"] === row["id"]);
      drop("documents", (r) => r["startup_id"] === row["id"]);
      for (const t of ["surveys", "connections", "verification_records"]) for (const r of this.tables[t]!) if (r["startup_id"] === row["id"]) r["startup_id"] = null;
    } else if (table === "surveys") {
      drop("survey_questions", (r) => r["survey_id"] === row["id"]);
      drop("survey_responses", (r) => r["survey_id"] === row["id"]);
    } else if (table === "connections") {
      drop("messages", (r) => r["connection_id"] === row["id"]);
    }
  }

  // ---------------------------------------------------------------- query execution
  execute(spec: QuerySpec, ctx: Ctx): DemoResult {
    try {
      if (!this.tables[spec.table]) return fail(`relation "public.${spec.table}" does not exist`, "42P01");
      return this.run(spec, ctx);
    } catch (e) {
      const err = e as Error & { code?: string };
      const out: DemoError = { message: err.message };
      if (err.code) out.code = err.code;
      return { data: null, error: out, count: null };
    }
  }

  private visible(table: string, ctx: Ctx): Row[] {
    return ctx.admin ? this.tables[table]! : this.tables[table]!.filter((r) => this.canRead(table, r, ctx.viewer));
  }

  private run(spec: QuerySpec, ctx: Ctx): DemoResult {
    const { table } = spec;
    let affected: Row[] = [];
    const v = ctx.viewer;

    if (!ctx.admin && !v && spec.action !== "select") return fail("permission denied (not signed in)", "42501");

    switch (spec.action) {
      case "select":
        affected = this.visible(table, ctx).filter((r) => matches(r, spec.filters));
        break;
      case "insert": {
        const rows = Array.isArray(spec.values) ? spec.values : [spec.values ?? {}];
        const staged = this.tables[table]!.slice();
        try {
          affected = rows.map((r) => this.insertRow(table, r, ctx));
        } catch (e) {
          this.tables[table] = staged; // roll the batch back like a single SQL statement
          throw e;
        }
        break;
      }
      case "upsert": {
        const rows = Array.isArray(spec.values) ? spec.values : [spec.values ?? {}];
        const conflictCols = (spec.onConflict ?? PK[table] ?? "id").split(",").map((c) => c.trim());
        for (const r of rows) {
          const existing = this.tables[table]!.find((x) => conflictCols.every((c) => x[c] === r[c] && r[c] !== undefined));
          if (!existing) { affected.push(this.insertRow(table, r, ctx)); continue; }
          if (spec.ignoreDuplicates) continue;
          if (!ctx.admin && (!this.canModify(table, existing, v) && !(table === "profile_private" && existing["user_id"] === v))) {
            throw new RlsError(`new row violates row-level security policy for table "${table}"`);
          }
          const next = { ...existing, ...clone(r), updated_at: nowIso() };
          this.beforeUpdate(table, existing, next);
          Object.assign(existing, next);
          if (table === "verification_records") this.syncVerification(existing);
          affected.push(existing);
        }
        break;
      }
      case "update": {
        const targets = this.visible(table, ctx).filter((r) => matches(r, spec.filters) && (ctx.admin || this.canModify(table, r, v)));
        for (const row of targets) {
          const next: Row = { ...row, ...clone((spec.values as Row) ?? {}) };
          if (row["updated_at"] !== undefined) next["updated_at"] = nowIso();
          if (!ctx.admin && !this.canInsert(table, next, v) && !["connections", "reports", "notifications", "messages"].includes(table)) {
            throw new RlsError(`new row violates row-level security policy for table "${table}"`);
          }
          this.beforeUpdate(table, row, next);
          Object.assign(row, next);
          if (table === "verification_records") this.syncVerification(row);
          affected.push(row);
        }
        break;
      }
      case "delete": {
        const targets = this.visible(table, ctx).filter((r) => matches(r, spec.filters) && (ctx.admin || this.canModify(table, r, v)));
        const set = new Set(targets);
        this.tables[table] = this.tables[table]!.filter((r) => !set.has(r));
        for (const r of targets) this.afterDelete(table, r);
        affected = targets;
        break;
      }
    }

    const count = spec.count ? affected.length : null;
    const isRead = spec.action === "select";
    if (!isRead && !spec.returning) return { data: null, error: null, count };
    if (spec.head) return { data: null, error: null, count };

    let rows = affected.slice();
    for (const o of [...spec.order].reverse()) rows.sort((a, b) => (o.asc ? 1 : -1) * cmp(a[o.col], b[o.col]));
    if (spec.limit != null) rows = rows.slice(0, spec.limit);
    const out = rows.map((r) => project(r, spec.columns));

    if (spec.mode === "many") return { data: out, error: null, count };
    if (out.length === 1) return { data: out[0], error: null, count };
    if (out.length === 0 && spec.mode === "maybe") return { data: null, error: null, count };
    return { data: null, error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" }, count };
  }
}

function fail(message: string, code?: string): DemoResult {
  const error: DemoError = { message };
  if (code) error.code = code;
  return { data: null, error, count: null };
}
