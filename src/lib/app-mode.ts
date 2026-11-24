/**
 * Decides how the app runs and validates configuration. Safe to import from client AND server code.
 *
 *   • "supabase" – real backend (auth, Postgres + RLS, storage). Needs SUPABASE_URL + publishable key.
 *   • "demo"     – Local Demo Mode: an in-memory simulation with seeded sample data. No real auth,
 *                  nothing persisted, no Supabase needed. It is NEVER entered as a silent fallback
 *                  after a failed real login: the mode is decided once, from configuration.
 *
 * Resolution (VITE_APP_MODE, or APP_MODE on the server):
 *   "demo"      → always Local Demo Mode (even if Supabase variables exist)
 *   "supabase"  → always real backend; missing variables are a configuration error
 *   unset/auto  → real backend when SUPABASE_URL and the publishable key are both present, else demo
 *
 * ⚠️ Only VITE_-prefixed variables reach the browser. SUPABASE_SERVICE_ROLE_KEY must never be
 * given a VITE_ prefix; it is read exclusively by src/integrations/supabase/client.server.ts.
 */

export type AppMode = "supabase" | "demo";

export class ConfigError extends Error {
  readonly missing: string[];
  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "ConfigError";
    this.missing = missing;
  }
}

function read(name: string): string | undefined {
  // Vite inlines import.meta.env.VITE_* at build time (client + SSR bundles).
  const viteEnv = (import.meta.env ?? {}) as unknown as Record<string, string | undefined>;
  const fromVite = viteEnv[name];
  if (fromVite) return fromVite;
  // Server runtime (Node/Bun): plain process env. Guarded because `process` is absent in browsers.
  if (typeof process !== "undefined" && process.env) {
    const fromProc = process.env[name];
    if (fromProc) return fromProc;
  }
  return undefined;
}

function firstOf(...names: string[]): string | undefined {
  for (const n of names) {
    const v = read(n)?.trim();
    if (v) return v;
  }
  return undefined;
}

export type PublicConfig = {
  mode: AppMode;
  /** Present only in supabase mode. */
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  /** Human-readable problems (empty when configuration is complete). */
  problems: string[];
};

let cached: PublicConfig | undefined;

export function getPublicConfig(): PublicConfig {
  if (cached) return cached;
  const requested = (firstOf("VITE_APP_MODE", "APP_MODE") ?? "auto").toLowerCase();
  const url = firstOf("VITE_SUPABASE_URL", "SUPABASE_URL");
  const key = firstOf("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
  const problems: string[] = [];

  if (requested !== "auto" && requested !== "demo" && requested !== "supabase") {
    problems.push(`VITE_APP_MODE must be "auto", "demo" or "supabase" (got "${requested}").`);
  }
  if (url && !/^https?:\/\/[^\s/]+/i.test(url)) problems.push("VITE_SUPABASE_URL must be a full URL such as https://<project-ref>.supabase.co.");
  if (key && /service_role|sb_secret_/i.test(key)) {
    problems.push("The publishable key looks like a SECRET key. Use the anon/publishable key here; the service-role key belongs only in SUPABASE_SERVICE_ROLE_KEY.");
  }

  const configured = !!url && !!key && problems.length === 0;
  let mode: AppMode;
  if (requested === "demo") mode = "demo";
  else if (requested === "supabase") mode = "supabase";
  else mode = configured ? "supabase" : "demo";

  if (mode === "supabase") {
    const missing = [...(!url ? ["VITE_SUPABASE_URL"] : []), ...(!key ? ["VITE_SUPABASE_PUBLISHABLE_KEY"] : [])];
    if (missing.length) problems.push(`Missing ${missing.join(" and ")}. Copy .env.example to .env and fill them in (see README → Supabase configuration), or set VITE_APP_MODE=demo to use Local Demo Mode.`);
  }

  cached = {
    mode,
    problems,
    ...(url ? { supabaseUrl: url } : {}),
    ...(key ? { supabasePublishableKey: key } : {}),
  };
  return cached;
}

export const getAppMode = (): AppMode => getPublicConfig().mode;
export const isDemoMode = (): boolean => getAppMode() === "demo";

/** Throws a ConfigError with an actionable message when supabase mode is selected but misconfigured. */
export function requireSupabaseConfig(): { url: string; key: string } {
  const c = getPublicConfig();
  if (c.mode !== "supabase") throw new ConfigError("Supabase is not active: the app is running in Local Demo Mode.");
  if (!c.supabaseUrl || !c.supabasePublishableKey || c.problems.length) {
    throw new ConfigError(`Supabase configuration is incomplete. ${c.problems.join(" ")}`, ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  }
  return { url: c.supabaseUrl, key: c.supabasePublishableKey };
}

/** Test helper. */
export function __resetConfigCache() {
  cached = undefined;
}
