import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";

const seedSql = readFileSync(new URL("../../scripts/seed-demo-startups.sql", import.meta.url), "utf8");
const startupRows = Array.from(
  seedSql.matchAll(/\(\s*'([0-9a-f-]{36})'::uuid,\s*'([0-9a-f-]{36})'::uuid,\s*'([^']+)'/g),
  ([, id, founderId, name]) => ({ id, founderId, name }),
);

describe("optional demo startup seed", () => {
  test("uses unique stable startup identities and guards repeated runs without overwriting existing rows", () => {
    expect(startupRows).toHaveLength(10);
    expect(new Set(startupRows.map((row) => row.id)).size).toBe(startupRows.length);
    expect(new Set(startupRows.map((row) => `${row.founderId}:${row.name.trim().toLowerCase()}`)).size).toBe(startupRows.length);
    expect(seedSql).toContain("WHERE NOT EXISTS (");
    expect(seedSql).toContain("existing.id = demo.id");
    expect(seedSql).toContain("lower(existing.name) = lower(demo.name)");
    expect(seedSql).toContain("ON CONFLICT (id) DO NOTHING");
  });

  test("keeps each fixed demo startup ID associated with its canonical seed name", () => {
    expect(Object.fromEntries(startupRows.map((row) => [row.id, row.name]))).toEqual({
      "bbbb0000-0000-4000-8000-000000000008": "LedgerNest",
      "bbbb0000-0000-4000-8000-000000000009": "ClassOrbit",
      "bbbb0000-0000-4000-8000-000000000010": "ReLoop Local",
      "bbbb0000-0000-4000-8000-000000000011": "NookMap",
      "bbbb0000-0000-4000-8000-000000000012": "CargoPebble",
      "bbbb0000-0000-4000-8000-000000000013": "CarePatch",
      "bbbb0000-0000-4000-8000-000000000014": "ShiftRide",
      "bbbb0000-0000-4000-8000-000000000015": "MandiMap",
      "bbbb0000-0000-4000-8000-000000000016": "SocioSync",
      "bbbb0000-0000-4000-8000-000000000017": "StudioFlow",
    });
  });
});
const baseSql = readFileSync(new URL("../../scripts/seed-demo-data.sql", import.meta.url), "utf8");

describe("demo seed referential integrity and repeatability", () => {
  test("the base seed is guarded so a second run is a no-op", () => {
    expect(baseSql).toContain("do $seed$");
    expect(baseSql).toContain("if exists (select 1 from public.profiles where id = '11111111-1111-4111-8111-000000000001')");
  });

  test("every problem / founder referenced by the optional startup seed exists in the base seed", () => {
    const baseProblems = new Set(Array.from(baseSql.matchAll(/\('(aaaa0000-[0-9a-f-]{27})'/g), (m) => m[1]));
    const baseFounders = new Set(Array.from(baseSql.matchAll(/\('(11111111-[0-9a-f-]{27})'/g), (m) => m[1]));
    const referencedProblems = Array.from(seedSql.matchAll(/'(aaaa0000-[0-9a-f-]{27})'::uuid/g), (m) => m[1]!);
    const referencedFounders = Array.from(seedSql.matchAll(/'(11111111-[0-9a-f-]{27})'::uuid/g), (m) => m[1]!);
    expect(referencedProblems.length).toBeGreaterThan(0);
    for (const id of referencedProblems) expect(baseProblems.has(id)).toBe(true);
    for (const id of referencedFounders) expect(baseFounders.has(id)).toBe(true);
  });
});

describe("migration set", () => {
  const dir = new URL("../../drizzle/migrations/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => f.replace(/\.sql$/, ""));

  test("the journal lists every migration file exactly once", () => {
    const journal = JSON.parse(readFileSync(new URL("meta/_journal.json", dir), "utf8")) as { entries: { idx: number; tag: string }[] };
    expect([...journal.entries.map((e) => e.tag)].sort()).toEqual([...files].sort());
    expect(journal.entries.map((e) => e.idx)).toEqual(journal.entries.map((_, i) => i));
  });

  test("already-applied migrations keep their original names (never renamed or removed)", () => {
    for (const original of [
      "0000_startupbridge_core_schema", "0001_seed_demo_data", "0002_storage_policies", "0003_general_user_surveys",
      "0005_general_user_document_restriction", "0006_founder_verification", "0007_verification_private_fields",
      "0008_verification_investor_fields", "0008_tighten_roles_and_votes_read_policies", "0009_tighten_profile_comment_analysis_read_policies",
    ]) expect(files.includes(original)).toBe(true);
  });

  test("storage buckets are created by an additive migration", () => {
    expect(readFileSync(new URL("0010_create_storage_buckets.sql", dir), "utf8")).toContain("on conflict (id) do nothing");
  });
});
