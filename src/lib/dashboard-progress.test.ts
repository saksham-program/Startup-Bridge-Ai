import { describe, expect, test } from "bun:test";
import { getStartupReadiness } from "./dashboard-progress";

describe("getStartupReadiness", () => {
  test("counts only startup details and pitch deck confirmed by records", () => {
    const readiness = getStartupReadiness(
      {
        tagline: "Care without waiting",
        industry: null,
        stage: "mvp",
        location: null,
        problem: "Long clinic queues",
        solution: "A digital appointment workflow",
        business_model: null,
        market_info: null,
        team: [{ name: "Karan" }],
      },
      false,
      false,
    );

    expect(readiness.completed).toBe(5);
    expect(readiness.total).toBe(11);
    expect(readiness.percent).toBe(45);
    expect(readiness.items.find((item) => item.label === "Pitch deck")?.complete).toBe(false);
  });

  test("marks readiness complete only when every field and a pitch deck exist", () => {
    const readiness = getStartupReadiness(
      {
        tagline: "Care without waiting",
        industry: "Healthcare",
        stage: "mvp",
        location: "Bengaluru",
        problem: "Long clinic queues",
        solution: "A digital appointment workflow",
        business_model: "Subscription",
        market_info: "Clinics in Bengaluru",
        team: [{ name: "Karan" }],
      },
      true,
      true,
    );

    expect(readiness.completed).toBe(11);
    expect(readiness.percent).toBe(100);
  });
});