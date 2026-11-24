/**
 * Server-function auth middleware.
 *
 * - Supabase mode: verifies the caller's Supabase JWT and exposes an RLS-scoped client + user id.
 * - Local Demo Mode: accepts ONLY demo persona tokens (see src/lib/demo/token.ts) and exposes the
 *   simulated store. Demo tokens are rejected outright when a real backend is configured.
 */
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getPublicConfig, requireSupabaseConfig } from "@/lib/app-mode";
import { createSupabaseFetch } from "./fetch";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const request = getRequest();
  if (!request?.headers) throw new Error("Unauthorized: No request headers available");

  const authHeader = request.headers.get("authorization");
  if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
  if (!authHeader.startsWith("Bearer ")) throw new Error("Unauthorized: Only Bearer tokens are supported");
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("Unauthorized: No token provided");

  if (getPublicConfig().mode === "demo") {
    const { parseDemoToken } = await import("@/lib/demo/token");
    const { createDemoServerClient, demoDb } = await import("@/lib/demo/store.server");
    const userId = parseDemoToken(token);
    const profile = userId ? demoDb().tables["profiles"]!.find((p) => p["id"] === userId) : undefined;
    if (!userId || !profile) throw new Error("Unauthorized: Invalid session. Please sign in again.");
    const { DEMO_ACCOUNTS } = await import("@/lib/constants");
    const acct = Object.values(DEMO_ACCOUNTS).find((a) => a.id === userId);
    return next({
      context: {
        supabase: createDemoServerClient(userId),
        userId,
        claims: { sub: userId, email: acct?.email ?? `${userId}@demo.local`, user_metadata: { full_name: profile["full_name"], demo: true } } as Record<string, unknown> & { sub: string },
      },
    });
  }

  const { url, key } = requireSupabaseConfig();
  if (token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

  const supabase = createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) throw new Error("Unauthorized: Invalid token");
  if (!data.claims.sub) throw new Error("Unauthorized: No user ID found in token");

  return next({ context: { supabase, userId: data.claims.sub, claims: data.claims } });
});
