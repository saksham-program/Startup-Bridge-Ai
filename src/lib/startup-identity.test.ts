import { describe, expect, test } from "bun:test";
import { isStartupId, resolveStartupId, startupMatchesParam } from "./startup-identity";

const STARTUP_ID = "bbbb0000-0000-4000-8000-000000000001";
const OTHER_STARTUP_ID = "bbbb0000-0000-4000-8000-000000000003";
const FOUNDER_ID = "11111111-1111-4111-8111-000000000001";
const PROBLEM_ID = "aaaa0000-0000-4000-8000-000000000001";

describe("isStartupId", () => {
  test("accepts a UUID", () => {
    expect(isStartupId(STARTUP_ID)).toBe(true);
  });

  test("rejects empty, non-string, and malformed values", () => {
    expect(isStartupId("")).toBe(false);
    expect(isStartupId("queuecare")).toBe(false);
    expect(isStartupId(null)).toBe(false);
    expect(isStartupId(undefined)).toBe(false);
    expect(isStartupId(STARTUP_ID.toUpperCase())).toBe(true);
  });
});

describe("resolveStartupId", () => {
  test("uses startups.id from a discover/search row and ignores founder_id and problem_id", () => {
    expect(
      resolveStartupId({
        id: STARTUP_ID,
        founder_id: FOUNDER_ID,
        problem_id: PROBLEM_ID,
        name: "QueueCare",
        tagline: "Skip the OPD queue, not the care",
        stage: "mvp",
      }),
    ).toBe(STARTUP_ID);
  });

  test("uses nested startup.id from an investor match payload", () => {
    expect(
      resolveStartupId({
        startup: {
          id: STARTUP_ID,
        },
      }),
    ).toBe(STARTUP_ID);
  });

  test("prefers nested startup.id over founder_id on a match card", () => {
    expect(
      resolveStartupId({
        id: FOUNDER_ID,
        founder_id: FOUNDER_ID,
        startup: { id: STARTUP_ID },
      }),
    ).toBe(STARTUP_ID);
  });

  test("uses the exact startup ID from a nested investor-startup match", () => {
    const matchId = "99999999-9999-4999-8999-999999999999";
    expect(
      resolveStartupId({
        id: matchId,
        startup: { id: STARTUP_ID },
      }),
    ).toBe(STARTUP_ID);
  });

  test("uses startup_id when that is the explicit foreign key", () => {
    expect(resolveStartupId({ startup_id: STARTUP_ID })).toBe(STARTUP_ID);
  });

  test("never maps a founder or problem identity onto a startup route", () => {
    expect(resolveStartupId({ id: FOUNDER_ID })).toBeNull();
    expect(resolveStartupId({ id: PROBLEM_ID })).toBeNull();
    expect(resolveStartupId({ founder_id: FOUNDER_ID, problem_id: PROBLEM_ID })).toBeNull();
  });

  test("returns null for missing or invalid sources", () => {
    expect(resolveStartupId(null)).toBeNull();
    expect(resolveStartupId(undefined)).toBeNull();
    expect(resolveStartupId({ id: "not-a-uuid", stage: "mvp" })).toBeNull();
  });
});

describe("startupMatchesParam", () => {
  test("requires the loaded row to be the same startup as the route param", () => {
    expect(startupMatchesParam({ id: STARTUP_ID }, STARTUP_ID)).toBe(true);
    expect(startupMatchesParam({ id: OTHER_STARTUP_ID }, STARTUP_ID)).toBe(false);
    expect(startupMatchesParam({ id: STARTUP_ID }, FOUNDER_ID)).toBe(false);
    expect(startupMatchesParam(null, STARTUP_ID)).toBe(false);
    expect(startupMatchesParam({ id: STARTUP_ID }, "not-a-uuid")).toBe(false);
  });
});
