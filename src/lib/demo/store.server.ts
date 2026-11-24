/**
 * Local Demo Mode — server-side store. Holds ONE in-memory database per server process
 * (survives dev-server hot reloads). Data is simulated and lost when the process restarts.
 * Server-only: imported dynamically from server functions, never from client code.
 */
import { getRequest } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isDemoMode } from "@/lib/app-mode";
import { DEMO_ACCOUNTS } from "@/lib/constants";
import { DemoDb, type DemoResult, type QuerySpec } from "./engine";
import { DemoQuery } from "./query-builder";
import { DEMO_SEED } from "./seed.generated";
import { SAMPLE_PDF_DATA_URL } from "./sample-pdf";
import { parseDemoToken } from "./token";

type G = typeof globalThis & { __startupbridgeDemoDb?: DemoDb };

export function assertDemoMode() {
  if (!isDemoMode()) throw new Error("Local Demo Mode is not active. Demo endpoints are disabled while a Supabase backend is configured.");
}

export function demoDb(): DemoDb {
  assertDemoMode();
  const g = globalThis as G;
  if (!g.__startupbridgeDemoDb) g.__startupbridgeDemoDb = new DemoDb(DEMO_SEED);
  return g.__startupbridgeDemoDb;
}

export function resetDemoDb() {
  assertDemoMode();
  (globalThis as G).__startupbridgeDemoDb = new DemoDb(DEMO_SEED);
}

/** Resolves the demo persona from the request's Authorization header (demo tokens only). */
export function demoViewerFromRequest(): string | null {
  const header = getRequest()?.headers.get("authorization") ?? "";
  const id = parseDemoToken(/^Bearer (\S+)$/.exec(header)?.[1]);
  if (!id) return null;
  return demoDb().tables["profiles"]!.some((p) => p["id"] === id) ? id : null;
}

export type DemoWireResult = { data: any; error: { message: string; code?: string } | null; count: number | null }; // eslint-disable-line @typescript-eslint/no-explicit-any

type Call =
  | { kind: "query"; spec: QuerySpec }
  | { kind: "rpc"; name: string; args: Record<string, unknown> }
  | { kind: "reset" }
  | { kind: "deck" };

export async function handleDemoCall(call: Call): Promise<DemoWireResult> {
  assertDemoMode();
  const viewer = demoViewerFromRequest();
  if (call.kind === "reset") {
    resetDemoDb();
    return { data: true, error: null, count: null };
  }
  if (call.kind === "deck") return { data: SAMPLE_PDF_DATA_URL, error: null, count: null };
  if (call.kind === "rpc") return demoDb().rpc(call.name, call.args, { viewer }) as DemoWireResult;
  return demoDb().execute(call.spec, { viewer }) as DemoWireResult;
}

/**
 * A supabase-js–shaped client backed by the demo store, for use inside server functions.
 * `admin: true` mimics the service-role client (bypasses the simulated RLS).
 */
export function createDemoServerClient(userId: string | null, admin = false): SupabaseClient<Database> {
  const ctx = { viewer: userId, admin };
  const run = async (spec: QuerySpec): Promise<DemoResult> => demoDb().execute(spec, ctx);
  const accountFor = (id: string) => Object.values(DEMO_ACCOUNTS).find((a) => a.id === id);
  const client = {
    from: (table: string) => new DemoQuery(table, run),
    rpc: async (name: string, args: Record<string, unknown>) => demoDb().rpc(name, args, ctx),
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: SAMPLE_PDF_DATA_URL }, error: null }),
      }),
    },
    auth: {
      admin: {
        getUserById: async (id: string) => {
          const a = accountFor(id);
          return { data: { user: a ? { id: a.id, email: a.email, user_metadata: { full_name: a.name, demo: true } } : null }, error: null };
        },
        createUser: async () => ({ data: { user: null }, error: null }),
        updateUserById: async () => ({ data: { user: null }, error: null }),
      },
    },
  };
  return client as unknown as SupabaseClient<Database>;
}
