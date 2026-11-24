#!/usr/bin/env node
// Loads the OPTIONAL demo data. Safe to run repeatedly (both SQL files are guarded).
//   bun run db:seed
// Do NOT run this against a production database that real users rely on.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, root } from "./lib-env.mjs";

const sql = connect();
try {
  const [{ exists }] = await sql`select to_regclass('public.profiles') is not null as exists`;
  if (!exists) throw new Error("Tables not found. Run `bun run db:migrate` first.");
  for (const file of ["scripts/seed-demo-data.sql", "scripts/seed-demo-startups.sql"]) {
    console.log(`run    ${file}`);
    await sql.unsafe(readFileSync(resolve(root, file), "utf8"));
  }
  console.log("\nSample data is in place. No login accounts are created by this script.");
} catch (e) {
  console.error("\nSeed failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
