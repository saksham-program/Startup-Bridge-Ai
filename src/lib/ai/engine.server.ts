/**
 * Centralized AI engine.
 *
 * Two providers behind one interface:
 *  - "llm": any OpenAI-compatible provider (server-side; see ./llm.server.ts and .env.example).
 *  - "demo": deterministic heuristics used when no provider is configured or the call fails.
 *
 * Every result carries `provider` so the UI can label demo output clearly.
 */
import { CATEGORIES } from "../constants";
import { llmChat, llmConfigured } from "./llm.server";

export type Provider = "llm" | "demo";

export function aiAvailable() {
  return llmConfigured();
}

async function callJson<T>(system: string, user: string, schemaHint: string): Promise<T | null> {
  if (!llmConfigured()) return null;
  try {
    const content = await llmChat(
      [
        { role: "system", content: `${system}\nRespond ONLY with a JSON object matching: ${schemaHint}. Keep strings short and factual. Never claim guaranteed demand; use "indication" language.` },
        { role: "user", content: user },
      ],
      { json: true },
    );
    return JSON.parse(content) as T;
  } catch (e) {
    console.error("[ai] call failed", e);
    return null;
  }
}

// ---------- shared heuristics ----------
const STOP = new Set("the a an and or of to in for on at by with is are be from this that these those it its as no not can cannot my our their have has do does".split(" "));
export function tokens(s: string) {
  return (s.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? []).filter((t) => !STOP.has(t));
}
export function jaccard(a: string[], b: string[]) {
  const A = new Set(a), B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}
const CATEGORY_LEXICON: Record<string, string[]> = {
  Healthcare: ["hospital", "patient", "doctor", "medicine", "health", "clinic", "nurse", "elderly", "opd", "medical"],
  Agriculture: ["farmer", "crop", "mandi", "produce", "harvest", "agri", "farm", "vegetable"],
  Transportation: ["metro", "commute", "auto", "bus", "traffic", "ride", "transport", "last-mile", "shuttle"],
  Education: ["student", "school", "college", "learning", "teacher", "english", "course", "exam"],
  Fintech: ["payment", "credit", "loan", "insurance", "income", "bank", "upi", "udhaar", "finance"],
  Housing: ["rent", "housing", "pg", "flat", "broker", "accommodation", "landlord"],
  Consumer: ["society", "delivery", "shop", "household", "visitor", "customer"],
  Sustainability: ["waste", "recycling", "e-waste", "climate", "plastic", "pollution", "energy"],
  Logistics: ["cold-chain", "logistics", "transit", "warehouse", "shipping", "supply"],
};
export function guessCategory(text: string, fallback: string) {
  const toks = tokens(text);
  let best = fallback, bestScore = 0;
  for (const [cat, words] of Object.entries(CATEGORY_LEXICON)) {
    const score = toks.filter((t) => words.some((w) => t.includes(w))).length;
    if (score > bestScore) { best = cat; bestScore = score; }
  }
  return (CATEGORIES as readonly string[]).includes(best) ? best : fallback;
}
const POS = ["yes", "love", "great", "useful", "helpful", "definitely", "good", "interested", "would", "need", "want", "excellent", "important"];
const NEG = ["no", "not", "never", "expensive", "worried", "concern", "problem", "bad", "hard", "difficult", "won't", "unlikely", "useless", "price"];
export function sentimentOf(text: string): "positive" | "negative" | "neutral" {
  const t = tokens(text);
  const p = t.filter((x) => POS.includes(x)).length, n = t.filter((x) => NEG.includes(x)).length;
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}

// ---------- 1–3. Problem analysis (categorize, keywords, duplicates, similarity, demand) ----------
export type ProblemAnalysis = {
  category: string;
  keywords: string[];
  demand_indication: "Low" | "Medium" | "High";
  related_problems: number;
  similar_problems: number;
  similar_ids: string[];
  suggested_categories: string[];
  summary: string;
};
export async function analyzeProblem(
  problem: { id: string; title: string; description: string; category: string; frequency: string | null; upvote_count: number; comment_count: number; tags: string[] },
  others: { id: string; title: string; description: string; category: string }[],
): Promise<{ result: ProblemAnalysis; provider: Provider }> {
  const text = `${problem.title} ${problem.description} ${problem.tags.join(" ")}`;
  const myToks = tokens(text);
  const sims = others
    .filter((o) => o.id !== problem.id)
    .map((o) => ({ id: o.id, score: jaccard(myToks, tokens(`${o.title} ${o.description}`)), sameCat: o.category === problem.category }))
    .sort((a, b) => b.score - a.score);
  const similar = sims.filter((s) => s.score >= 0.18);
  const related = sims.filter((s) => s.score >= 0.08 || s.sameCat).length;
  const freqW = { Daily: 3, Weekly: 2, Monthly: 1 }[problem.frequency ?? ""] ?? 0.5;
  const demandRaw = freqW * 1.2 + problem.upvote_count * 0.8 + problem.comment_count * 0.6 + Math.min(related, 5) * 0.4;
  const demand: ProblemAnalysis["demand_indication"] = demandRaw >= 7 ? "High" : demandRaw >= 3.5 ? "Medium" : "Low";
  const keywords = [...new Set(myToks)].slice(0, 6);
  const heuristic: ProblemAnalysis = {
    category: guessCategory(text, problem.category),
    keywords,
    demand_indication: demand,
    related_problems: related,
    similar_problems: similar.length,
    similar_ids: similar.slice(0, 3).map((s) => s.id),
    suggested_categories: [...new Set([guessCategory(text, problem.category), problem.category])],
    summary: `AI-based indication: ${demand.toLowerCase()} apparent demand from ${problem.upvote_count} upvotes, ${problem.comment_count} comments and a ${(problem.frequency ?? "unspecified").toLowerCase()} frequency. ${similar.length ? `${similar.length} similar problem(s) already exist on the platform.` : "No close duplicates detected."}`,
  };

  const llm = await callJson<Partial<ProblemAnalysis>>(
    "You categorize real-world problems posted on a startup platform and extract keywords.",
    `Problem title: ${problem.title}\nDescription: ${problem.description}\nUser-chosen category: ${problem.category}\nAllowed categories: ${CATEGORIES.join(", ")}\nPlatform signals: upvotes=${problem.upvote_count}, comments=${problem.comment_count}, frequency=${problem.frequency}, similar problems detected=${similar.length}.`,
    `{"category": string, "keywords": string[5], "suggested_categories": string[2], "summary": string (<=45 words, must include the phrase "AI-based indication")}`,
  );
  if (llm) {
    return {
      provider: "llm",
      result: {
        ...heuristic,
        category: (CATEGORIES as readonly string[]).includes(llm.category ?? "") ? llm.category! : heuristic.category,
        keywords: Array.isArray(llm.keywords) && llm.keywords.length ? llm.keywords.slice(0, 6) : heuristic.keywords,
        suggested_categories: Array.isArray(llm.suggested_categories) && llm.suggested_categories.length ? llm.suggested_categories.slice(0, 3) : heuristic.suggested_categories,
        summary: typeof llm.summary === "string" && llm.summary.length > 10 ? llm.summary : heuristic.summary,
      },
    };
  }
  return { provider: "demo", result: heuristic };
}

// ---------- 4–6. Survey analysis + sentiment + demand ----------
export type SurveyAnalysis = {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  sentiment: string;
  demand_indication: string;
  common_issues: string[];
  common_suggestions: string[];
  top_trends: string[];
  summary: string;
  charts: {
    ratings: { label: string; value: number }[];
    yesNo: { label: string; value: number }[];
    choices: { question: string; data: { label: string; value: number }[] }[];
  };
};
type Q = { id: string; type: string; prompt: string; options: unknown };
export async function analyzeSurvey(
  survey: { title: string; description: string | null },
  questions: Q[],
  responses: { answers: Record<string, unknown> }[],
): Promise<{ result: SurveyAnalysis; provider: Provider }> {
  const total = responses.length;
  let pos = 0, neg = 0, neu = 0;
  const ratings: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  const yesNo = { Yes: 0, No: 0 };
  const choiceCounts: Record<string, Record<string, number>> = {};
  const freeText: string[] = [];
  for (const r of responses) {
    let score = 0;
    for (const q of questions) {
      const a = r.answers[q.id];
      if (a == null || a === "") continue;
      if (q.type === "rating") {
        const n = Number(a);
        if (n >= 1 && n <= 5) { ratings[String(n)] = (ratings[String(n)] ?? 0) + 1; score += n >= 4 ? 1 : n <= 2 ? -1 : 0; }
      } else if (q.type === "yes_no") {
        if (a === "Yes") { yesNo.Yes++; score += 1; } else if (a === "No") { yesNo.No++; score -= 1; }
      } else if (q.type === "single_choice" || q.type === "multiple_choice") {
        const vals = Array.isArray(a) ? (a as string[]) : [String(a)];
        choiceCounts[q.id] ??= {};
        for (const v of vals) choiceCounts[q.id]![v] = (choiceCounts[q.id]![v] ?? 0) + 1;
      } else {
        const t = String(a);
        freeText.push(t);
        const s = sentimentOf(t);
        score += s === "positive" ? 0.5 : s === "negative" ? -0.5 : 0;
      }
    }
    if (score > 0.5) pos++; else if (score < -0.5) neg++; else neu++;
  }
  const ratio = total ? pos / total : 0;
  const sentiment = total === 0 ? "No data" : ratio >= 0.7 ? "Positive" : ratio >= 0.45 ? "Mostly positive" : ratio >= 0.3 ? "Mixed" : "Negative";
  const demand = total === 0 ? "Insufficient data" : ratio >= 0.7 && total >= 5 ? "High" : ratio >= 0.5 ? "Medium-High" : ratio >= 0.3 ? "Medium" : "Low";
  const issues = freeText.filter((t) => sentimentOf(t) === "negative").slice(0, 4);
  const suggestions = freeText.filter((t) => sentimentOf(t) !== "negative").slice(0, 4);
  const trends: string[] = [];
  const ratingTotal = Object.values(ratings).reduce((a, b) => a + b, 0);
  if (ratingTotal) {
    const avg = Object.entries(ratings).reduce((a, [k, v]) => a + Number(k) * v, 0) / ratingTotal;
    trends.push(`Average rating ${avg.toFixed(2)}/5`);
  }
  if (yesNo.Yes + yesNo.No) trends.push(`${Math.round((yesNo.Yes / (yesNo.Yes + yesNo.No)) * 100)}% answered Yes on intent questions`);
  const choices = questions
    .filter((q) => choiceCounts[q.id])
    .map((q) => ({ question: q.prompt, data: Object.entries(choiceCounts[q.id]!).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value) }));
  for (const c of choices.slice(0, 2)) if (c.data[0]) trends.push(`"${c.data[0].label}" was the top answer for "${c.question.slice(0, 40)}"`);

  const heuristic: SurveyAnalysis = {
    total, positive: pos, negative: neg, neutral: neu, sentiment, demand_indication: demand,
    common_issues: issues, common_suggestions: suggestions, top_trends: trends,
    summary: total === 0
      ? "AI-generated analysis: no responses yet. Share the survey with your target audience to start collecting signals."
      : `AI-generated analysis: based on ${total} response(s), users showed ${sentiment.toLowerCase()} interest in the proposed solution.${issues[0] ? ` The most common concern was: "${issues[0].slice(0, 60)}".` : ""}${total < 10 ? " Sample size is small – treat these indications with caution." : ""}`,
    charts: {
      ratings: Object.entries(ratings).map(([label, value]) => ({ label: `${label}★`, value })),
      yesNo: [{ label: "Yes", value: yesNo.Yes }, { label: "No", value: yesNo.No }],
      choices,
    },
  };
  if (total === 0) return { provider: "demo", result: heuristic };

  const llm = await callJson<Partial<SurveyAnalysis>>(
    "You analyze startup validation survey responses. Be balanced and concise.",
    `Survey: ${survey.title}\n${survey.description ?? ""}\nQuestions: ${questions.map((q) => `[${q.type}] ${q.prompt}`).join(" | ")}\nAggregate: total=${total}, positive=${pos}, negative=${neg}, neutral=${neu}, ratings=${JSON.stringify(ratings)}, yes/no=${JSON.stringify(yesNo)}\nFree-text answers: ${freeText.slice(0, 40).join(" || ")}`,
    `{"common_issues": string[<=4], "common_suggestions": string[<=4], "top_trends": string[<=4], "summary": string (<=60 words, start with "AI-generated analysis:")}`,
  );
  if (llm) {
    return {
      provider: "llm",
      result: {
        ...heuristic,
        common_issues: Array.isArray(llm.common_issues) ? llm.common_issues : heuristic.common_issues,
        common_suggestions: Array.isArray(llm.common_suggestions) ? llm.common_suggestions : heuristic.common_suggestions,
        top_trends: Array.isArray(llm.top_trends) && llm.top_trends.length ? llm.top_trends : heuristic.top_trends,
        summary: typeof llm.summary === "string" ? llm.summary : heuristic.summary,
      },
    };
  }
  return { provider: "demo", result: heuristic };
}

// ---------- 7. Idea validation score ----------
export type ValidationScore = {
  score: number;
  factors: Record<"user_interest" | "survey_response" | "problem_frequency" | "feedback_sentiment" | "engagement" | "market_signals", number>;
  positives: string[];
  concerns: string[];
  summary: string;
};
export function computeValidationScore(input: {
  problem: { upvote_count: number; comment_count: number; frequency: string | null } | null;
  surveys: { total: number; positive: number; negative: number }[];
  startup: { stage: string; team: unknown; milestonesDone: number; milestonesTotal: number; hasDeck: boolean; website: string | null };
}): ValidationScore {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  const p = input.problem;
  const totalResp = input.surveys.reduce((a, s) => a + s.total, 0);
  const posResp = input.surveys.reduce((a, s) => a + s.positive, 0);
  const posRatio = totalResp ? posResp / totalResp : 0;
  const freqW = { Daily: 100, Weekly: 75, Monthly: 50, Occasionally: 30 }[p?.frequency ?? ""] ?? 40;
  const factors = {
    user_interest: clamp(p ? 35 + Math.min(p.upvote_count, 20) * 3 : 30),
    survey_response: clamp(totalResp === 0 ? 20 : 30 + Math.min(totalResp, 30) * 1.5 + posRatio * 25),
    problem_frequency: clamp(p ? freqW : 40),
    feedback_sentiment: clamp(totalResp === 0 ? 40 : 25 + posRatio * 65),
    engagement: clamp(p ? 30 + Math.min(p.comment_count, 15) * 4 : 25),
    market_signals: clamp(
      35 +
        ({ idea: 0, prototype: 8, mvp: 16, early_traction: 26, growth: 34 }[input.startup.stage] ?? 0) +
        (Array.isArray(input.startup.team) ? Math.min(input.startup.team.length, 3) * 5 : 0) +
        (input.startup.hasDeck ? 6 : 0) +
        (input.startup.website ? 4 : 0) +
        (input.startup.milestonesTotal ? (input.startup.milestonesDone / input.startup.milestonesTotal) * 10 : 0),
    ),
  };
  const weights = { user_interest: 0.2, survey_response: 0.2, problem_frequency: 0.15, feedback_sentiment: 0.2, engagement: 0.1, market_signals: 0.15 };
  const score = clamp(Object.entries(factors).reduce((a, [k, v]) => a + v * weights[k as keyof typeof weights], 0));
  const positives: string[] = [], concerns: string[] = [];
  if (p && p.upvote_count >= 3) positives.push(`Strong problem engagement (${p.upvote_count} upvotes)`); else concerns.push("Limited problem engagement so far");
  if (totalResp >= 5) positives.push(`${totalResp} survey responses collected`); else concerns.push(totalResp ? `Limited responses (${totalResp})` : "No survey responses yet");
  if (posRatio >= 0.6 && totalResp) positives.push(`${Math.round(posRatio * 100)}% positive feedback`); else if (totalResp) concerns.push("Mixed or negative feedback sentiment");
  if (p?.frequency === "Daily" || p?.frequency === "Weekly") positives.push(`${p.frequency} recurring problem`);
  if (input.startup.stage === "early_traction" || input.startup.stage === "growth") positives.push("Early traction signals");
  if (!input.startup.hasDeck) concerns.push("No pitch deck uploaded");
  if (!p) concerns.push("Startup is not linked to a validated problem");
  return { score, factors, positives, concerns, summary: "AI-assisted score derived from platform signals. Not a guarantee of startup success." };
}

// ---------- 8–9. Matching ----------
export type MatchReason = { label: string; matched: boolean; weight: number };

export type StartupInvestorMatchIdentity = {
  score: number;
  startup: { id: string };
  investor: { user_id: string };
};

/** Keep only one active recommendation for each stable startup/investor pair. */
export function deduplicateStartupInvestorPairs<T extends StartupInvestorMatchIdentity>(
  matches: readonly T[],
): T[] {
  const uniquePairs = new Map<string, T>();

  for (const match of matches) {
    const pairKey = `${match.startup.id}\u0000${match.investor.user_id}`;
    const existing = uniquePairs.get(pairKey);
    if (!existing || match.score > existing.score) uniquePairs.set(pairKey, match);
  }

  return [...uniquePairs.values()];
}

export function matchStartupInvestor(
  s: { industry: string | null; stage: string; location: string | null; funding_requirement: number | null; validation_score: number | null },
  i: { preferred_industries: string[]; preferred_stages: string[]; investment_min: number | null; investment_max: number | null; investment_interests: string[]; location: string | null },
) {
  const reasons: MatchReason[] = [];
  const ind = !!s.industry && i.preferred_industries.map((x) => x.toLowerCase()).includes(s.industry.toLowerCase());
  reasons.push({ label: "Industry match", matched: ind, weight: 30 });
  const stage = i.preferred_stages.includes(s.stage);
  reasons.push({ label: "Stage match", matched: stage, weight: 25 });
  const fr = s.funding_requirement ?? 0;
  const fund = fr > 0 && (i.investment_max ?? 0) > 0 ? fr >= (i.investment_min ?? 0) * 0.5 && fr <= (i.investment_max ?? 0) * 1.5 : false;
  reasons.push({ label: "Funding range match", matched: fund, weight: 20 });
  const city = (x: string | null) => (x ?? "").split(",")[0]?.trim().toLowerCase();
  const loc = !!s.location && !!i.location && (city(s.location) === city(i.location) || i.location.toLowerCase().includes("india") && s.location.toLowerCase().includes("india"));
  reasons.push({ label: "Location preference", matched: loc, weight: 10 });
  const interest = !!s.industry && i.investment_interests.some((x) => x.toLowerCase().includes((s.industry ?? "").toLowerCase()) || x.toLowerCase() === "sector agnostic");
  reasons.push({ label: "Startup interests", matched: interest, weight: 10 });
  const validated = (s.validation_score ?? 0) >= 60;
  reasons.push({ label: "Validation score ≥ 60", matched: validated, weight: 5 });
  const score = reasons.reduce((a, r) => a + (r.matched ? r.weight : 0), 0);
  return { score, reasons };
}

// ---------- 10. Spam detection ----------
export function spamCheck(text: string): { spam: boolean; reason?: string } {
  const links = (text.match(/https?:\/\//g) ?? []).length;
  if (links >= 3) return { spam: true, reason: "Too many links" };
  if (/(.)\1{9,}/.test(text)) return { spam: true, reason: "Repeated characters" };
  const letters = text.replace(/[^a-z]/gi, "");
  if (letters.length > 30 && letters.replace(/[a-z]/g, "").length / letters.length > 0.8) return { spam: true, reason: "Excessive capitals" };
  if (/\b(free money|crypto giveaway|click here to win|earn \$\d+ per day)\b/i.test(text)) return { spam: true, reason: "Matches known spam phrases" };
  return { spam: false };
}
