/**
 * Browser/SSR Supabase client.
 *
 * Import like:  import { supabase } from "@/integrations/supabase/client";
 *
 * - Supabase mode: a real supabase-js client using the PUBLISHABLE key only (safe for the browser).
 * - Local Demo Mode: a clearly separate simulated client (see src/lib/demo/client.ts).
 *
 * The mode is decided once from configuration (src/lib/app-mode.ts). A failed real login never
 * switches the app into demo mode.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getPublicConfig, requireSupabaseConfig } from "@/lib/app-mode";
import { createDemoBrowserClient } from "@/lib/demo/client";
import { createSupabaseFetch } from "./fetch";

function createSupabaseClient(): SupabaseClient<Database> {
  if (getPublicConfig().mode === "demo") return createDemoBrowserClient();

  const { url, key } = requireSupabaseConfig(); // throws a ConfigError with an actionable message
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      storage: typeof window !== "undefined" ? window.localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let _supabase: SupabaseClient<Database> | undefined;

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
