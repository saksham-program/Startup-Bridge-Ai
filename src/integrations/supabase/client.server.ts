/**
 * Server-side Supabase client using the SERVICE-ROLE key — bypasses RLS.
 * SERVER ONLY. Never import from route/component code, never expose the key with a VITE_ prefix.
 * Load inside server handlers:  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
 *
 * In Local Demo Mode this returns the simulated admin client instead (no keys involved).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getPublicConfig } from "@/lib/app-mode";
import { requireServiceRoleConfig } from "./service-key.server";
import { createDemoServerClient } from "@/lib/demo/store.server";
import { createSupabaseFetch } from "./fetch";

function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (getPublicConfig().mode === "demo") return createDemoServerClient(null, true);
  const { url, serviceKey } = requireServiceRoleConfig();
  return createClient<Database>(url, serviceKey, {
    global: { fetch: createSupabaseFetch(serviceKey) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _supabaseAdmin: SupabaseClient<Database> | undefined;

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
