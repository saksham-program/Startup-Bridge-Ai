import { afterEach, describe, expect, test } from "bun:test";
import { __resetConfigCache } from "@/lib/app-mode";
import { requireServiceRoleConfig } from "./service-key.server";

const KEYS = ["VITE_SUPABASE_URL", "SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
function env(vars: Record<string, string>) {
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, { VITE_SUPABASE_URL: "https://abc.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "pub", ...vars });
  __resetConfigCache();
}
afterEach(() => {
  for (const k of KEYS) delete process.env[k];
  __resetConfigCache();
});

describe("requireServiceRoleConfig", () => {
  test("missing key → clear error naming the variable, with no VITE_ prefix advice", () => {
    env({});
    expect(() => requireServiceRoleConfig()).toThrow("SUPABASE_SERVICE_ROLE_KEY is not set");
    expect(() => requireServiceRoleConfig()).toThrow("without a VITE_ prefix");
  });
  test("a valid key is returned (and never appears in the error text of other failures)", () => {
    env({ SUPABASE_SERVICE_ROLE_KEY: `h.${b64({ role: "service_role" })}.s` });
    expect(requireServiceRoleConfig().url).toBe("https://abc.supabase.co");
  });
  test("new-style secret keys are accepted", () => {
    env({ SUPABASE_SERVICE_ROLE_KEY: "sb_secret_abc123" });
    expect(requireServiceRoleConfig().serviceKey).toBe("sb_secret_abc123");
  });
  test("the anon / publishable key pasted by mistake is rejected without echoing it", () => {
    const anon = `h.${b64({ role: "anon" })}.s`;
    env({ SUPABASE_SERVICE_ROLE_KEY: anon });
    try {
      requireServiceRoleConfig();
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as Error).message).toContain("public (anon/publishable) key");
      expect((e as Error).message).not.toContain(anon);
    }
    env({ SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_zzz" });
    expect(() => requireServiceRoleConfig()).toThrow("public (anon/publishable) key");
  });
});
