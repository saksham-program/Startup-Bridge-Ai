import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  analyzeProblem,
  analyzeSurvey,
  computeValidationScore,
  matchStartupInvestor,
  deduplicateStartupInvestorPairs,
  aiAvailable,
  type ProblemAnalysis,
  type SurveyAnalysis,
  type ValidationScore,
  type MatchReason,
} from "./ai/engine.server";

const idSchema = z.object({ id: z.string().uuid() });

export const getAiStatus = createServerFn({ method: "GET" }).handler(async () => ({ live: aiAvailable() }));

/** Run (or re-run) AI analysis for a problem. Any signed-in user may trigger it. */
export const runProblemAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: problem, error } = await supabase.from("problems").select("*").eq("id", data.id).single();
    if (error || !problem) throw new Error("Problem not found");
    const { data: others } = await supabase.from("problems").select("id,title,description,category").neq("id", data.id).limit(300);
    const { result, provider } = await analyzeProblem(problem, others ?? []);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_analyses").insert({ subject_type: "problem", subject_id: data.id, analysis_type: "problem_analysis", result, provider });
    if (problem.author_id === context.userId) {
      await supabaseAdmin.from("notifications").insert({ user_id: problem.author_id, type: "ai_analysis", title: "AI analysis completed", body: problem.title, link: `/problems/${problem.id}` });
    }
    return { result: result as ProblemAnalysis, provider };
  });

/** Founder-only: analyze responses for one of their surveys. */
export const runSurveyAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: survey } = await supabase.from("surveys").select("*").eq("id", data.id).single();
    if (!survey) throw new Error("Survey not found");
    if (survey.founder_id !== userId) throw new Error("Only the survey owner can run analysis");
    const [{ data: questions }, { data: responses }] = await Promise.all([
      supabase.from("survey_questions").select("*").eq("survey_id", data.id).order("position"),
      supabase.from("survey_responses").select("answers").eq("survey_id", data.id),
    ]);
    const { result, provider } = await analyzeSurvey(
      survey,
      questions ?? [],
      (responses ?? []).map((r) => ({ answers: (r.answers ?? {}) as Record<string, unknown> })),
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_analyses").insert({ subject_type: "survey", subject_id: data.id, analysis_type: "survey_analysis", result, provider });
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type: "ai_analysis", title: "AI survey analysis completed", body: survey.title, link: `/surveys/${survey.id}/results` });
    return { result: result as SurveyAnalysis, provider };
  });

/** Founder-only: recompute the validation score for their startup. */
export const runValidationScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => idSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: startup } = await supabase.from("startups").select("*").eq("id", data.id).single();
    if (!startup) throw new Error("Startup not found");
    if (startup.founder_id !== userId) throw new Error("Only the founder can compute the score");
    const [{ data: problem }, { data: surveys }, { data: milestones }, { data: docs }] = await Promise.all([
      startup.problem_id ? supabase.from("problems").select("upvote_count,comment_count,frequency").eq("id", startup.problem_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("surveys").select("id").eq("startup_id", startup.id),
      supabase.from("milestones").select("status").eq("startup_id", startup.id),
      supabase.from("documents").select("id").eq("startup_id", startup.id),
    ]);
    const surveyStats: { total: number; positive: number; negative: number }[] = [];
    for (const s of surveys ?? []) {
      const { data: latest } = await supabase
        .from("ai_analyses").select("result").eq("subject_type", "survey").eq("subject_id", s.id).eq("analysis_type", "survey_analysis")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const r = (latest?.result ?? null) as { total?: number; positive?: number; negative?: number } | null;
      if (r) surveyStats.push({ total: r.total ?? 0, positive: r.positive ?? 0, negative: r.negative ?? 0 });
      else {
        const { count } = await supabase.from("survey_responses").select("id", { count: "exact", head: true }).eq("survey_id", s.id);
        surveyStats.push({ total: count ?? 0, positive: Math.round((count ?? 0) * 0.5), negative: 0 });
      }
    }
    const result = computeValidationScore({
      problem: problem ?? null,
      surveys: surveyStats,
      startup: {
        stage: startup.stage,
        team: startup.team,
        milestonesDone: (milestones ?? []).filter((m) => m.status === "done").length,
        milestonesTotal: (milestones ?? []).length,
        hasDeck: (docs ?? []).length > 0,
        website: startup.website,
      },
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ai_analyses").insert({ subject_type: "startup", subject_id: startup.id, analysis_type: "validation_score", result, provider: "demo" });
    await supabaseAdmin.from("startups").update({ validation_score: result.score }).eq("id", startup.id);
    await supabaseAdmin.from("notifications").insert({ user_id: userId, type: "ai_analysis", title: "AI analysis completed", body: `Validation score for ${startup.name}: ${result.score}/100`, link: `/startups/${startup.id}` });
    return { result: result as ValidationScore };
  });

export type MatchResult = {
  score: number;
  reasons: MatchReason[];
  startup: { id: string; name: string; tagline: string | null; industry: string | null; stage: string; location: string | null; funding_requirement: number | null; validation_score: number | null; founder_id: string; logo_url: string | null };
  investor: { user_id: string; full_name: string; firm_name: string | null; investor_type: string | null; verification_status: string; avatar_url: string | null; location: string | null; preferred_industries: string[]; preferred_stages: string[]; investment_min: number | null; investment_max: number | null };
};

/** Recommendations: founder → investors for each of their startups; investor → startups. */
export const getMatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isFounder = roles?.some((r) => r.role === "founder");
    const isInvestor = roles?.some((r) => r.role === "investor");
    const [{ data: startups }, { data: investors }, { data: profiles }] = await Promise.all([
      isFounder ? supabase.from("startups").select("*").eq("founder_id", userId) : supabase.from("startups").select("*").eq("is_public", true),
      isInvestor ? supabase.from("investor_profiles").select("*").eq("user_id", userId) : supabase.from("investor_profiles").select("*"),
      supabase.from("profiles").select("id,full_name,avatar_url,location"),
    ]);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const out: MatchResult[] = [];
    for (const s of startups ?? []) {
      for (const i of investors ?? []) {
        const p = pmap.get(i.user_id);
        if (!p) continue;
        const { score, reasons } = matchStartupInvestor(s, { ...i, location: p.location });
        if (score < 25) continue;
        out.push({
          score,
          reasons,
          startup: { id: s.id, name: s.name, tagline: s.tagline, industry: s.industry, stage: s.stage, location: s.location, funding_requirement: s.funding_requirement, validation_score: s.validation_score, founder_id: s.founder_id, logo_url: s.logo_url },
          investor: { user_id: i.user_id, full_name: p.full_name, firm_name: i.firm_name, investor_type: i.investor_type, verification_status: i.verification_status, avatar_url: p.avatar_url, location: p.location, preferred_industries: i.preferred_industries, preferred_stages: i.preferred_stages, investment_min: i.investment_min, investment_max: i.investment_max },
        });
      }
    }
    const uniqueMatches = deduplicateStartupInvestorPairs(out);
    uniqueMatches.sort((a, b) => b.score - a.score);
    return { matches: uniqueMatches.slice(0, 40), mode: isFounder ? "founder" : isInvestor ? "investor" : "viewer" } as const;
  });
