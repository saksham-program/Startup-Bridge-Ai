import { describe, expect, test } from "bun:test";
import { DemoDb, type Filter, type QuerySpec } from "./engine";
import { DEMO_SEED } from "./seed.generated";

const FOUNDER = "11111111-1111-4111-8111-000000000001";
const INVESTOR = "22222222-2222-4222-8222-000000000001";
const GENERAL = "33333333-3333-4333-8333-000000000001";
const GENERAL2 = "33333333-3333-4333-8333-000000000002";

function q(table: string, over: Partial<QuerySpec> = {}): QuerySpec {
  return { table, action: "select", filters: [], order: [], returning: false, mode: "many", ...over };
}
const eq = (col: string, val: unknown): Filter => ({ op: "eq", col, val });
const fresh = () => new DemoDb(DEMO_SEED);
const rows = (r: { data: unknown }) => r.data as Record<string, unknown>[];

describe("Local Demo Mode engine", () => {
  test("loads the SQL-derived seed and replays triggers", () => {
    const db = fresh();
    const problem = db.execute(q("problems", { filters: [eq("id", "aaaa0000-0000-4000-8000-000000000001")], mode: "single" }), { viewer: GENERAL });
    expect(problem.error).toBeNull();
    expect((problem.data as Record<string, unknown>)["upvote_count"]).toBe(4);
    expect((problem.data as Record<string, unknown>)["comment_count"]).toBe(2);
    const surveys = db.execute(q("surveys", { filters: [eq("id", "cccc0000-0000-4000-8000-000000000001")], mode: "single" }), { viewer: FOUNDER });
    expect((surveys.data as Record<string, unknown>)["response_count"]).toBe(4);
    expect(db.tables["startups"]!.length).toBe(16);
  });

  test("simulated RLS hides other users' notifications, drafts and private rows", () => {
    const db = fresh();
    const mine = db.execute(q("notifications"), { viewer: GENERAL });
    expect(rows(mine).every((n) => n["user_id"] === GENERAL)).toBe(true);
    const draftsAsGeneral = db.execute(q("surveys", { filters: [eq("status", "draft")] }), { viewer: GENERAL });
    expect(rows(draftsAsGeneral)).toHaveLength(0);
    const draftsAsOwner = db.execute(q("surveys", { filters: [eq("status", "draft")] }), { viewer: FOUNDER });
    expect(rows(draftsAsOwner)).toHaveLength(1);
    expect(rows(db.execute(q("profile_private"), { viewer: GENERAL }))).toHaveLength(0);
  });

  test("voting inserts, bumps the counter, rejects duplicates and unvoting decrements", () => {
    const db = fresh();
    const pid = "aaaa0000-0000-4000-8000-000000000010";
    const ins = db.execute(q("votes", { action: "insert", values: { user_id: GENERAL, problem_id: pid } }), { viewer: GENERAL });
    expect(ins.error).toBeNull();
    const dup = db.execute(q("votes", { action: "insert", values: { user_id: GENERAL, problem_id: pid } }), { viewer: GENERAL });
    expect(dup.error?.message).toContain("duplicate");
    const forged = db.execute(q("votes", { action: "insert", values: { user_id: GENERAL2, problem_id: pid } }), { viewer: GENERAL });
    expect(forged.error?.message).toContain("row-level security");
    const get = () => (db.execute(q("problems", { filters: [eq("id", pid)], mode: "single" }), { viewer: GENERAL }).data as Record<string, unknown>)["upvote_count"];
    expect(get()).toBe(1);
    db.execute(q("votes", { action: "delete", filters: [eq("user_id", GENERAL), eq("problem_id", pid)] }), { viewer: GENERAL });
    expect(get()).toBe(0);
  });

  test("general users cannot create connection requests; founders can and recipient is notified", () => {
    const db = fresh();
    const bad = db.execute(q("connections", { action: "insert", values: { requester_id: GENERAL, recipient_id: INVESTOR } }), { viewer: GENERAL });
    expect(bad.error?.message).toContain("row-level security");
    const good = db.execute(q("connections", { action: "insert", values: { requester_id: FOUNDER, recipient_id: GENERAL2 }, returning: true, mode: "single" }), { viewer: FOUNDER });
    expect(good.error).toBeNull();
    const notes = db.execute(q("notifications", { filters: [eq("type", "connection_request")] }), { viewer: GENERAL2 });
    expect(rows(notes).length).toBeGreaterThan(0);
  });

  test("recipient can accept a pending request: responded_at is set and requester notified", () => {
    const db = fresh();
    const id = "eeee0000-0000-4000-8000-000000000003"; // MetroHop -> Neha (pending)
    const notOwner = db.execute(q("connections", { action: "update", values: { status: "accepted" }, filters: [eq("id", id)], returning: true }), { viewer: FOUNDER });
    expect(rows(notOwner)).toHaveLength(0);
    const ok = db.execute(q("connections", { action: "update", values: { status: "accepted" }, filters: [eq("id", id)], returning: true, mode: "single" }), { viewer: INVESTOR });
    expect(ok.error).toBeNull();
    expect((ok.data as Record<string, unknown>)["responded_at"]).toBeTruthy();
  });

  test("or(), ilike, counts with head and single/maybeSingle semantics", () => {
    const db = fresh();
    const or = db.execute(q("connections", { filters: [{ op: "or", expr: `requester_id.eq.${FOUNDER},recipient_id.eq.${FOUNDER}` }] }), { viewer: FOUNDER });
    expect(rows(or).length).toBe(2);
    const like = db.execute(q("problems", { filters: [{ op: "or", expr: "title.ilike.%hospital%,description.ilike.%hospital%" }] }), { viewer: GENERAL });
    expect(rows(like).length).toBeGreaterThan(0);
    const head = db.execute(q("problems", { columns: "id", count: "exact", head: true }), { viewer: GENERAL });
    expect(head.data).toBeNull();
    expect(head.count).toBe(12);
    expect(db.execute(q("problems", { filters: [eq("id", "nope")], mode: "single" }), { viewer: GENERAL }).error?.code).toBe("PGRST116");
    expect(db.execute(q("problems", { filters: [eq("id", "nope")], mode: "maybe" }), { viewer: GENERAL }).data).toBeNull();
  });

  test("ordering (desc) and limit", () => {
    const db = fresh();
    const r = db.execute(q("problems", { order: [{ col: "upvote_count", asc: false }], limit: 3, columns: "id,upvote_count" }), { viewer: GENERAL });
    const counts = rows(r).map((x) => x["upvote_count"] as number);
    expect(counts).toHaveLength(3);
    expect([...counts].sort((a, b) => b - a)).toEqual(counts);
  });

  test("upsert with onConflict + ignoreDuplicates", () => {
    const db = fresh();
    const v = { user_id: GENERAL, item_type: "startup", item_id: "bbbb0000-0000-4000-8000-000000000001" };
    const spec = q("saved_items", { action: "upsert", values: v, onConflict: "user_id,item_type,item_id", ignoreDuplicates: true });
    expect(db.execute(spec, { viewer: GENERAL }).error).toBeNull();
    expect(db.execute(spec, { viewer: GENERAL }).error).toBeNull();
    expect(db.tables["saved_items"]!.filter((r) => r["user_id"] === GENERAL && r["item_type"] === "startup").length).toBe(1);
  });

  test("deleting a problem is author-only and cascades; rpc has_role works", () => {
    const db = fresh();
    const pid = "aaaa0000-0000-4000-8000-000000000001"; // authored by GENERAL
    db.execute(q("problems", { action: "delete", filters: [eq("id", pid)] }), { viewer: GENERAL2 }); // not the author -> no-op
    expect(db.tables["problems"]!.some((p) => p["id"] === pid)).toBe(true);
    db.execute(q("problems", { action: "delete", filters: [eq("id", pid)] }), { viewer: GENERAL });
    expect(db.tables["problems"]!.some((p) => p["id"] === pid)).toBe(false);
    expect(db.tables["votes"]!.some((v) => v["problem_id"] === pid)).toBe(false);
    expect(db.rpc("has_role", { _user_id: FOUNDER, _role: "moderator" }, { viewer: FOUNDER }).data).toBe(true);
    expect(db.rpc("has_role", { _user_id: GENERAL, _role: "founder" }, { viewer: GENERAL }).data).toBe(false);
  });
});

describe("or() expressions used by the app", () => {
  test("nested and() pair lookup used by connection requests", () => {
    const db = fresh();
    const other = INVESTOR;
    const expr = `and(requester_id.eq.${FOUNDER},recipient_id.eq.${other}),and(requester_id.eq.${other},recipient_id.eq.${FOUNDER})`;
    const r = db.execute(q("connections", { filters: [{ op: "or", expr }] }), { viewer: FOUNDER });
    expect(rows(r).length).toBe(1);
  });
  test("surveys visible to owner or published, search ilike with %term%", () => {
    const db = fresh();
    const r = db.execute(q("surveys", { filters: [{ op: "or", expr: `founder_id.eq.${FOUNDER},status.eq.published` }] }), { viewer: FOUNDER });
    expect(rows(r).length).toBe(4);
    const s = db.execute(q("startups", { filters: [eq("is_public", true), { op: "or", expr: "name.ilike.%queue%,tagline.ilike.%queue%,problem.ilike.%queue%" }] }), { viewer: GENERAL });
    expect(rows(s).length).toBeGreaterThan(0);
  });
});
