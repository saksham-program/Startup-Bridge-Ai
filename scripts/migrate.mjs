#!/usr/bin/env node
// Applies drizzle/migrations/*.sql in journal order, once each, tracking them in public.app_migrations.
//   bun run db:migrate
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { connect, root } from "./lib-env.mjs";

const dir = resolve(root, "drizzle/migrations");
// Order = drizzle journal order (the order the migrations were authored in; note two files share the
// prefix 0008, so plain alphabetical order would differ). Any .sql file not in the journal runs afterwards, sorted.
const onDisk = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const journal = JSON.parse(readFileSync(resolve(dir, "meta/_journal.json"), "utf8")).entries.map((e) => `${e.tag}.sql`);
const files = [...journal.filter((f) => onDisk.includes(f)), ...onDisk.filter((f) => !journal.includes(f))];
const sql = connect();

try {
  await sql`create table if not exists public.app_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const done = new Set((await sql`select name from public.app_migrations`).map((r) => r.name));
  let applied = 0;
  for (const file of files) {
    if (done.has(file)) { console.log(`skip   ${file}`); continue; }
    console.log(`apply  ${file}`);
    await sql.begin(async (tx) => {
      await tx.unsafe(readFileSync(resolve(dir, file), "utf8"));
      await tx`insert into public.app_migrations (name) values (${file})`;
    });
    applied++;
  }
  console.log(applied ? `\nDone: ${applied} migration(s) applied.` : "\nDatabase is already up to date.");
} catch (e) {
  console.error("\nMigration failed:", e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
