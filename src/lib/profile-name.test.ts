import { describe, expect, test } from "bun:test";
import { resolveProfileName } from "./profile-name";
import { DEMO_ACCOUNTS } from "./constants";

describe("resolveProfileName", () => {
  test("keeps the existing profile name", () => {
    expect(resolveProfileName("  Priya Sharma  ", "Karan Mehta")).toBe("Priya Sharma");
  });

  test("recovers a blank profile name from the account name", () => {
    expect(resolveProfileName("  ", "Karan Mehta")).toBe("Karan Mehta");
  });

  test("returns null when neither name is available", () => {
    expect(resolveProfileName(null, " ")).toBeNull();
  });

  test("uses the canonical name for the seeded demo founder account", () => {
    const demoFounder = DEMO_ACCOUNTS.founder;
    expect(demoFounder.id).toBe("11111111-1111-4111-8111-000000000001");
    expect(resolveProfileName(null, demoFounder.name)).toBe("Karan Mehta");
  });
});