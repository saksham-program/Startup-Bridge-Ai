import { describe, expect, test } from "bun:test";
import { ensureOk } from "./supabase-helpers";

describe("ensureOk", () => {
  test("passes when every result succeeded", () => {
    expect(() => ensureOk({ error: null }, { error: null })).not.toThrow();
  });
  test("throws the first failure's message so a failed query is never mistaken for an empty list", () => {
    expect(() => ensureOk({ error: null }, { error: { message: "permission denied for table x" } }, { error: { message: "later" } })).toThrow("permission denied for table x");
  });
});
