/**
 * Server-only: reads and validates SUPABASE_SERVICE_ROLE_KEY.
 *
 * The `.server.ts` suffix makes the bundler refuse to include this file in browser code, and the key is
 * never given a VITE_ prefix. The key's VALUE is never logged or included in error messages.
 */
import { ConfigError, requireSupabaseConfig } from "@/lib/app-mode";

/** Reads the `role` claim of a legacy (JWT) Supabase key without verifying it; undefined for new-style keys. */
function jwtRole(key: string): string | undefined {
  const parts = key.split(".");
  if (parts.length !== 3) return undefined;
  try {
    const json = JSON.parse(Buffer.from(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as { role?: unknown };
    return typeof json.role === "string" ? json.role : undefined;
  } catch {
    return undefined;
  }
}

export function requireServiceRoleConfig(): { url: string; serviceKey: string } {
  const { url } = requireSupabaseConfig();
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!serviceKey) {
    throw new ConfigError(
      "SUPABASE_SERVICE_ROLE_KEY is not set. The server needs it to create new users' profiles and for system writes (notifications, audit logs, AI results). " +
        "Add it to your local .env (Supabase → Project Settings → API → service_role / secret key), without a VITE_ prefix, then restart the dev server.",
      ["SUPABASE_SERVICE_ROLE_KEY"],
    );
  }
  if (serviceKey.startsWith("sb_publishable_") || jwtRole(serviceKey) === "anon") {
    throw new ConfigError(
      "SUPABASE_SERVICE_ROLE_KEY contains the public (anon/publishable) key. Replace it with the service_role / secret key from Supabase → Project Settings → API.",
      ["SUPABASE_SERVICE_ROLE_KEY"],
    );
  }
  return { url, serviceKey };
}
