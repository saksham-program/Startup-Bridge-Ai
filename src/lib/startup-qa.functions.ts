import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const input = z.object({
  startupId: z.string().uuid(),
  question: z.string().trim().min(3).max(600),
});

export type QaSource = { id: string; label: string };
export type QaAnswer = { answer: string; sources: QaSource[]; provider: "llm" | "demo" };

/** Investor-only: answer a free-form question about a startup using only its stored information. */
export const askStartupQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => input.parse(i))
  .handler(async ({ data, context }): Promise<QaAnswer> => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "investor")) throw new Error("Only investors can ask questions about startups.");

    const { data: s } = await supabase.from("startups").select("*").eq("id", data.startupId).maybeSingle();
    if (!s) throw new Error("Startup not found or not visible to you.");

    const [founder, fp, milestones, docs, analyses, surveys] = await Promise.all([
      supabase.from("profiles").select("full_name,bio,location").eq("id", s.founder_id).maybeSingle(),
      supabase.from("founder_profiles").select("skills,startup_experience,industry,linkedin_url").eq("user_id", s.founder_id).maybeSingle(),
      supabase.from("milestones").select("title,status,due_date,description").eq("startup_id", s.id),
      supabase.from("documents").select("name,doc_type").eq("startup_id", s.id),
      supabase.from("ai_analyses").select("analysis_type,result,created_at").eq("subject_id", s.id).order("created_at", { ascending: false }).limit(2),
      supabase.from("surveys").select("title,status,description").eq("founder_id", s.founder_id).eq("status", "published").limit(5),
    ]);

    const sources: (QaSource & { body: string })[] = [
      { id: "S1", label: "Startup profile", body: JSON.stringify({ name: s.name, tagline: s.tagline, stage: s.stage, industry: s.industry, location: s.location, description: s.description, website: s.website }) },
      { id: "S2", label: "Problem & solution", body: JSON.stringify({ problem: s.problem, solution: s.solution, target_users: s.target_users }) },
      { id: "S3", label: "Business & market", body: JSON.stringify({ business_model: s.business_model, market_info: s.market_info, funding_requirement_inr: s.funding_requirement, validation_score: s.validation_score }) },
      { id: "S4", label: "Team", body: JSON.stringify(s.team) },
      { id: "S5", label: "Founder profile", body: JSON.stringify({ ...(founder.data ?? {}), ...(fp.data ?? {}) }) },
      { id: "S6", label: "Milestones", body: JSON.stringify(milestones.data ?? []) },
      { id: "S7", label: "Documents on file", body: JSON.stringify(docs.data ?? []) },
      { id: "S8", label: "AI validation analyses", body: JSON.stringify(analyses.data ?? []).slice(0, 3000) },
      { id: "S9", label: "Founder's published surveys", body: JSON.stringify(surveys.data ?? []) },
    ];

    const instructions =
      "You are a due-diligence assistant for startup investors. Answer ONLY from the numbered sources provided. " +
      "Cite sources inline like [S1]. If the sources don't contain the answer, say clearly that the information isn't available and suggest what to ask the founder. " +
      "Never invent numbers, customers or claims. Separate facts from your interpretation. Keep answers under 200 words, using short paragraphs or bullets. Write plain text only (no markdown, no asterisks); use \"- \" for bullets and short plain headings on their own line.";
    const context_ = sources.map((x) => `[${x.id}] ${x.label}: ${x.body}`).join("\n");

    const { llmChat, llmConfigured } = await import("./ai/llm.server");
    if (!llmConfigured()) {
      // Honest built-in fallback: no AI provider is configured, so show the most relevant on-file sources verbatim.
      const words = new Set(data.question.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
      const scored = sources
        .map((x) => ({ x, score: [...words].filter((w) => `${x.label} ${x.body}`.toLowerCase().includes(w)).length }))
        .sort((p, q) => q.score - p.score)
        .slice(0, 2)
        .filter((r) => r.score > 0);
      const picked = scored.length ? scored.map((r) => r.x) : sources.slice(0, 2);
      const text =
        "Built-in demo answer (no AI provider is configured, so this is not AI-generated). Relevant information on file:\n" +
        picked.map((x) => `- ${x.label} [${x.id}]: ${x.body.slice(0, 280)}`).join("\n") +
        "\nSet AI_API_KEY on the server to enable AI answers.";
      return { answer: text, sources: picked.map(({ id, label }) => ({ id, label })), provider: "demo" as const };
    }

    let answer: string;
    try {
      answer = await llmChat([
        { role: "system", content: instructions },
        { role: "user", content: `Sources:\n${context_}\n\nInvestor question: ${data.question}` },
      ], { maxTokens: 700 });
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : "The AI couldn't answer right now.");
    }
    if (!answer.trim()) throw new Error("The AI returned no answer. Try rephrasing your question.");

    const used = new Set(answer.match(/S\d/g) ?? []);
    return { answer: answer.trim(), sources: sources.filter((x) => used.has(x.id)).map(({ id, label }) => ({ id, label })), provider: "llm" as const };
  });
