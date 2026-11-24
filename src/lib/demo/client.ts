/**
 * Local Demo Mode — browser client.
 *
 * Implements just enough of the supabase-js surface (`from`, `rpc`, `auth`, `storage`) for the app,
 * backed by the in-memory demo store on the server (see store.server.ts). It is deliberately a
 * SEPARATE implementation from the real client:
 *   - there is no password check and no real authentication, only a "persona picker";
 *   - email/password sign-in and sign-up are refused with a clear message rather than faked;
 *   - it is only ever created when the app mode is "demo" (never as a fallback for a failed login).
 */
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { DEMO_ACCOUNTS, type PrimaryRole } from "@/lib/constants";
import { demoExec } from "./demo.functions";
import type { DemoResult, QuerySpec } from "./engine";
import { DemoQuery } from "./query-builder";
import { SAMPLE_PDF_DATA_URL } from "./sample-pdf";
import { demoToken, parseDemoToken } from "./token";

const SESSION_KEY = "startupbridge-demo-session";

export const DEMO_MODE_NOTICE =
  "No Supabase backend is configured, so sign-in and account creation are unavailable. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see README → Supabase configuration).";

class DemoAuthError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "AuthApiError";
  }
}

type Listener = (event: string, session: Session | null) => void;
const listeners = new Set<Listener>();
let memorySession: Session | null = null;

function buildSession(role: PrimaryRole): Session {
  const acct = DEMO_ACCOUNTS[role];
  const now = new Date().toISOString();
  const user = {
    id: acct.id,
    aud: "authenticated",
    role: "authenticated",
    email: acct.email,
    app_metadata: { provider: "local-demo" },
    user_metadata: { full_name: acct.name, role, demo: true },
    created_at: now,
  } as unknown as User;
  return { access_token: demoToken(acct.id), refresh_token: "local-demo", expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: "bearer", user } as Session;
}

function readSession(): Session | null {
  if (memorySession) return memorySession;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return parseDemoToken(s.access_token) ? (memorySession = s) : null;
  } catch {
    return null;
  }
}

function writeSession(s: Session | null) {
  memorySession = s;
  if (typeof window === "undefined") return;
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked: the in-memory session still works for this tab */
  }
}

function emit(event: string, s: Session | null) {
  for (const l of [...listeners]) {
    try { l(event, s); } catch (e) { console.error("[demo-auth] listener failed", e); }
  }
}

/** Starts a Local Demo session for one of the seeded personas. No credentials are checked. */
export function signInToLocalDemo(role: PrimaryRole): Session {
  const s = buildSession(role);
  writeSession(s);
  emit("SIGNED_IN", s);
  return s;
}

/** Restores the original seeded data on the server (all simulated changes are discarded). */
export async function resetLocalDemoData(): Promise<void> {
  const res = await demoExec({ data: { kind: "reset" } });
  if (res.error) throw new Error(res.error.message);
}

const exec = async (spec: QuerySpec): Promise<DemoResult> => {
  try {
    return (await demoExec({ data: { kind: "query", spec } as never })) as DemoResult;
  } catch (e) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Local Demo request failed" }, count: null };
  }
};

// Files "uploaded" in demo mode live only in this tab (object URLs), never on a server.
const uploads = new Map<string, string>();

export function createDemoBrowserClient(): SupabaseClient<Database> {
  const client = {
    from: (table: string) => new DemoQuery(table, exec),
    rpc: async (name: string, args: Record<string, unknown> = {}) => {
      try {
        return (await demoExec({ data: { kind: "rpc", name, args } })) as DemoResult;
      } catch (e) {
        return { data: null, error: { message: e instanceof Error ? e.message : "Local Demo request failed" }, count: null };
      }
    },
    auth: {
      getSession: async () => ({ data: { session: readSession() }, error: null }),
      getUser: async () => {
        const s = readSession();
        return s ? { data: { user: s.user }, error: null } : { data: { user: null }, error: new DemoAuthError("Auth session missing!") };
      },
      onAuthStateChange: (cb: Listener) => {
        listeners.add(cb);
        queueMicrotask(() => cb("INITIAL_SESSION", readSession()));
        return { data: { subscription: { id: "local-demo", callback: cb, unsubscribe: () => listeners.delete(cb) } } };
      },
      signOut: async () => {
        writeSession(null);
        emit("SIGNED_OUT", null);
        return { error: null };
      },
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new DemoAuthError(DEMO_MODE_NOTICE) }),
      signUp: async () => ({ data: { user: null, session: null }, error: new DemoAuthError(DEMO_MODE_NOTICE) }),
      resetPasswordForEmail: async () => ({ data: null, error: new DemoAuthError(DEMO_MODE_NOTICE) }),
      updateUser: async () => ({ data: { user: null }, error: new DemoAuthError(DEMO_MODE_NOTICE) }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, file: Blob) => {
          uploads.set(`${bucket}/${path}`, URL.createObjectURL(file));
          return { data: { path }, error: null };
        },
        createSignedUrl: async (path: string) => {
          const hit = uploads.get(`${bucket}/${path}`);
          if (hit) return { data: { signedUrl: hit }, error: null };
          if (bucket === "pitch-decks") return { data: { signedUrl: SAMPLE_PDF_DATA_URL }, error: null };
          return { data: null, error: { message: "Object not found (Local Demo Mode keeps uploads in this tab only)." } };
        },
      }),
    },
  };
  return client as unknown as SupabaseClient<Database>;
}
