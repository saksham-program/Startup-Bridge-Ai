import { describe, expect, test } from "bun:test";
import { deduplicateStartupInvestorPairs, matchStartupInvestor } from "./engine.server";

describe("investor-startup matching", () => {
  test("scores Meera Iyer's QueueCare pair from their actual profile fields", () => {
    const result = matchStartupInvestor(
      {
        industry: "Healthcare",
        stage: "mvp",
        location: "Bengaluru, India",
        funding_requirement: 8_000_000,
        validation_score: 69,
      },
      {
        preferred_industries: ["Agriculture", "Transportation", "Healthcare", "Education"],
        preferred_stages: ["idea", "prototype", "mvp"],
        investment_min: 1_000_000,
        investment_max: 10_000_000,
        investment_interests: ["Sector agnostic"],
        location: "Bengaluru, India",
      },
    );

    expect(result.score).toBe(100);
    expect(result.reasons.every((reason) => reason.matched)).toBe(true);
    expect(result.reasons.reduce((sum, reason) => sum + (reason.matched ? reason.weight : 0), 0)).toBe(result.score);
  });

  test("scores Aarav Shah's LedgerNest pair using investment ticket and startup funding separately", () => {
    const startupFundingRequirement = 6_500_000;
    const investorTicketMin = 5_000_000;
    const investorTicketMax = 30_000_000;
    const result = matchStartupInvestor(
      {
        industry: "Fintech",
        stage: "mvp",
        location: "Jaipur, India",
        funding_requirement: startupFundingRequirement,
        validation_score: 63,
      },
      {
        preferred_industries: ["Fintech", "SaaS", "Healthcare"],
        preferred_stages: ["mvp", "early_traction"],
        investment_min: investorTicketMin,
        investment_max: investorTicketMax,
        investment_interests: ["Fintech", "SaaS"],
        location: "Mumbai, India",
      },
    );

    expect(startupFundingRequirement).toBe(6_500_000);
    expect(investorTicketMin).toBe(5_000_000);
    expect(investorTicketMax).toBe(30_000_000);
    expect(result.score).toBe(100);
    expect(result.reasons.map((reason) => reason.label)).toEqual([
      "Industry match",
      "Stage match",
      "Funding range match",
      "Location preference",
      "Startup interests",
      "Validation score ≥ 60",
    ]);
    expect(result.reasons.every((reason) => reason.matched)).toBe(true);
  });

  test("does not mark incompatible criteria as matched", () => {
    const result = matchStartupInvestor(
      {
        industry: "Agriculture",
        stage: "idea",
        location: "Pune, India",
        funding_requirement: 100_000_000,
        validation_score: 20,
      },
      {
        preferred_industries: ["Fintech"],
        preferred_stages: ["mvp"],
        investment_min: 5_000_000,
        investment_max: 30_000_000,
        investment_interests: ["Fintech"],
        location: "Mumbai, India",
      },
    );

    expect(result.score).toBe(10);
    expect(result.reasons.filter((reason) => reason.matched).map((reason) => reason.label)).toEqual([
      "Location preference",
    ]);
  });

  test("returns one result per stable investor-startup pair without removing distinct startup matches", () => {
    const queueCareMatch = {
      score: 100,
      startup: { id: "bbbb0000-0000-4000-8000-000000000001", name: "QueueCare" },
      investor: { user_id: "22222222-2222-4222-8222-000000000003", full_name: "Meera Iyer" },
    };
    const lowerScoredDuplicate = {
      ...queueCareMatch,
      score: 85,
      startup: { ...queueCareMatch.startup, name: "Stale QueueCare card" },
    };
    const ledgerNestMatch = {
      score: 100,
      startup: { id: "bbbb0000-0000-4000-8000-000000000008", name: "LedgerNest" },
      investor: { user_id: "22222222-2222-4222-8222-000000000003", full_name: "Meera Iyer" },
    };
    const otherInvestorMatch = {
      score: 90,
      startup: queueCareMatch.startup,
      investor: { user_id: "22222222-2222-4222-8222-000000000002", full_name: "Aarav Shah" },
    };

    const result = deduplicateStartupInvestorPairs([
      lowerScoredDuplicate,
      queueCareMatch,
      ledgerNestMatch,
      otherInvestorMatch,
    ]);

    expect(result).toHaveLength(3);
    expect(result.find((match) => match.startup.id === queueCareMatch.startup.id && match.investor.user_id === queueCareMatch.investor.user_id)).toEqual(queueCareMatch);
    expect(result.filter((match) => match.investor.user_id === queueCareMatch.investor.user_id)).toHaveLength(2);
    expect(result.filter((match) => match.startup.id === queueCareMatch.startup.id)).toHaveLength(2);
  });

  test("keeps similarly named startups separate when their stable IDs differ", () => {
    const investor = { user_id: "22222222-2222-4222-8222-000000000003", full_name: "Meera Iyer" };
    const result = deduplicateStartupInvestorPairs([
      {
        score: 80,
        startup: { id: "bbbb0000-0000-4000-8000-000000000001", name: "QueueCare" },
        investor,
      },
      {
        score: 80,
        startup: { id: "bbbb0000-0000-4000-8000-000000000018", name: "Queue Care" },
        investor,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(new Set(result.map((match) => match.startup.id)).size).toBe(2);
  });
});