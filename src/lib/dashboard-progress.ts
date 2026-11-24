import type { Tables } from "@/integrations/supabase/types";

type StartupProgressSource = Pick<
  Tables<"startups">,
  "tagline" | "industry" | "stage" | "location" | "problem" | "solution" | "business_model" | "market_info" | "team"
>;

export type ReadinessItem = {
  label: string;
  complete: boolean;
};

export function getStartupReadiness(startup: StartupProgressSource, hasPitchDeck: boolean, hasPublishedSurvey: boolean) {
  const hasTeam = Array.isArray(startup.team) && startup.team.length > 0;
  const items: ReadinessItem[] = [
    { label: "Tagline", complete: Boolean(startup.tagline?.trim()) },
    { label: "Industry", complete: Boolean(startup.industry?.trim()) },
    { label: "Stage", complete: Boolean(startup.stage?.trim()) },
    { label: "Location", complete: Boolean(startup.location?.trim()) },
    { label: "Problem", complete: Boolean(startup.problem?.trim()) },
    { label: "Solution", complete: Boolean(startup.solution?.trim()) },
    { label: "Business model", complete: Boolean(startup.business_model?.trim()) },
    { label: "Market information", complete: Boolean(startup.market_info?.trim()) },
    { label: "Team", complete: hasTeam },
    { label: "Pitch deck", complete: hasPitchDeck },
    { label: "Published survey", complete: hasPublishedSurvey },
  ];
  const completed = items.filter((item) => item.complete).length;

  return {
    items,
    completed,
    total: items.length,
    percent: Math.round((completed / items.length) * 100),
  };
}