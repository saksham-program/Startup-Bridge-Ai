/**
 * Local Demo Mode session tokens.
 *
 * These are NOT secrets and NOT JWTs: they only tell the in-memory demo store which seeded demo
 * persona is "signed in". They are accepted by the server exclusively while the app runs in Local
 * Demo Mode (see requireSupabaseAuth) and never in Supabase mode.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const demoToken = (userId: string) => `demo.${userId}.local`;

export function parseDemoToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "demo" || parts[2] !== "local") return null;
  return UUID.test(parts[1] ?? "") ? parts[1]! : null;
}
