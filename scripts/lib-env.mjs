// Tiny .env loader + Postgres connector shared by the db scripts (no extra dependencies).
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv() {
  for (const name of [".env", ".env.local"]) {
    const file = resolve(root, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m || line.trimStart().startsWith("#")) continue;
      const val = m[2].replace(/^(['"])(.*)\1$/, "$2");
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}

export function connect() {
  loadEnv();
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is not set.\nAdd your Supabase Postgres connection string to .env (Project Settings → Database → Connection string → URI). See .env.example.");
    process.exit(1);
  }
  const local = /@(localhost|127\.0\.0\.1)/.test(url);
  // prepare:false keeps this compatible with Supabase's transaction pooler.
  return postgres(url, { max: 1, prepare: false, onnotice: (n) => console.log(`  notice: ${n.message}`), ...(local ? {} : { ssl: "require" }) });
}
