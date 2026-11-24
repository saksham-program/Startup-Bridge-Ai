import { afterEach, describe, expect, test } from "bun:test";
import { __resetConfigCache, getPublicConfig, requireSupabaseConfig } from "./app-mode";

const KEYS = ["VITE_APP_MODE", "APP_MODE", "VITE_SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
function env(vars: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  __resetConfigCache();
}
afterEach(() => env({}));

describe("app mode resolution", () => {
  test("no configuration → Local Demo Mode", () => {
    env({});
    expect(getPublicConfig().mode).toBe("demo");
    expect(getPublicConfig().problems).toHaveLength(0);
  });
  test("complete Supabase configuration → supabase mode", () => {
    env({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x" });
    expect(getPublicConfig().mode).toBe("supabase");
    expect(requireSupabaseConfig().url).toBe("https://abc.supabase.co");
  });
  test("VITE_APP_MODE=demo wins even when Supabase is configured", () => {
    env({ VITE_APP_MODE: "demo", VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "k" });
    expect(getPublicConfig().mode).toBe("demo");
  });
  test("VITE_APP_MODE=supabase without variables is an actionable error, never a silent demo", () => {
    env({ VITE_APP_MODE: "supabase" });
    expect(getPublicConfig().mode).toBe("supabase");
    expect(() => requireSupabaseConfig()).toThrow("VITE_SUPABASE_URL");
  });
  test("half-configured auto mode stays in demo (and requireSupabaseConfig refuses)", () => {
    env({ VITE_SUPABASE_URL: "https://abc.supabase.co" });
    expect(getPublicConfig().mode).toBe("demo");
    expect(() => requireSupabaseConfig()).toThrow("Local Demo Mode");
  });
  test("a secret key in the publishable slot is rejected", () => {
    env({ VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_abc" });
    expect(getPublicConfig().problems.join(" ")).toContain("SECRET");
    expect(getPublicConfig().mode).toBe("demo");
  });
  test("invalid URL and invalid mode are reported", () => {
    env({ VITE_APP_MODE: "banana", VITE_SUPABASE_URL: "not-a-url", VITE_SUPABASE_PUBLISHABLE_KEY: "k" });
    const p = getPublicConfig().problems.join(" ");
    expect(p).toContain("VITE_APP_MODE");
    expect(p).toContain("VITE_SUPABASE_URL");
  });
});
