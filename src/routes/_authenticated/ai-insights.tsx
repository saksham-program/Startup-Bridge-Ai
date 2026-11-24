import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Cell, Pie, PieChart, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { getAiStatus, runValidationScore } from "@/lib/ai.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, timeAgo } from "@/lib/utils-app";
import { DISCLAIMER } from "@/lib/constants";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/ai-insights")({
  head: () => ({
    meta: [
      { title: "AI insights — StartupBridge AI" },
      { name: "description", content: "Validation score breakdown, strengths, concerns and every AI analysis run on your startup." },
      { property: "og:title", content: "AI insights — StartupBridge AI" },
      { property: "og:description", content: "Validation score breakdown, strengths and concerns." },
    ],
  }),
  component: AiInsights,
});

type ValidationResult = {
  score: number;
  factors: Record<string, number>;
  positives: string[];
  concerns: string[];
  summary: string;
};

const FACTOR_LABELS: Record<string, string> = {
  user_interest: "User interest",
  survey_response: "Survey response",
  problem_frequency: "Problem frequency",
  feedback_sentiment: "Feedback sentiment",
  engagement: "Engagement",
  market_signals: "Market signals",
};

function AiInsights() {
  const { role, userId } = useMe();
  const [busy, setBusy] = useState(false);

  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });

  const data = useQuery({
    queryKey: ["ai-insights", userId],
    enabled: !!userId,
    queryFn: async () => {
      // The history list does not depend on the startups, so request both at the same time.
      const [startupsRes, historyRes] = await Promise.all([
        supabase.from("startups").select("id,name,validation_score").eq("founder_id", userId!),
        supabase.from("ai_analyses").select("id,analysis_type,subject_type,provider,created_at").order("created_at", { ascending: false }).limit(15),
      ]);
      ensureOk(startupsRes, historyRes);
      const startups = startupsRes.data;
      const history = historyRes.data;
      const ids = (startups ?? []).map((s) => s.id);
      const { data: score, error: scoreError } = ids.length
        ? await supabase.from("ai_analyses").select("result,created_at,subject_id").eq("analysis_type", "validation_score").in("subject_id", ids).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : { data: null, error: null };
      if (scoreError) throw new Error(scoreError.message);
      return { startups: startups ?? [], score: (score?.result ?? null) as ValidationResult | null, scoredAt: score?.created_at ?? null, history: history ?? [] };
    },
  });

  if (role && role !== "founder") {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">AI insights are part of the founder workspace</p>
        <p className="mt-1 text-sm text-muted-foreground">Validation scores appear on each startup page.</p>
        <Button asChild className="mt-4"><Link to="/discover">Discover startups</Link></Button>
      </div>
    );
  }

  const startup = data.data?.startups[0];
  const score = data.data?.score ?? null;

  async function recompute() {
    if (!startup) return;
    setBusy(true);
    try {
      const res = await runValidationScore({ data: { id: startup.id } });
      toast.success(`Validation score: ${res.result.score}/100`);
      await data.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (data.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>;
  if (data.isError) return <QueryErrorState title="AI insights didn’t load" error={data.error} onRetry={() => void data.refetch()} />;

  if (!startup) {
    return (
      <div className="empty-state p-10 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand"><Sparkles className="h-6 w-6" /></span>
        <p className="mt-3 font-semibold">Create your startup first</p>
        <p className="mt-1 text-sm text-muted-foreground">AI insights combine your problem, surveys, milestones and profile.</p>
        <Button asChild className="mt-4"><Link to="/my-startup">Go to my startup</Link></Button>
      </div>
    );
  }

  const radar = Object.entries(score?.factors ?? {}).map(([k, v]) => ({ factor: FACTOR_LABELS[k] ?? k, value: v }));
  const donut = [
    { name: "Score", value: score?.score ?? 0 },
    { name: "Remaining", value: 100 - (score?.score ?? 0) },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <span className="ai-badge mb-2"><Sparkles className="h-3 w-3" /> AI insight</span>
          <h1 className="text-2xl font-bold sm:text-3xl">AI insights</h1>
          <p className="mt-1 text-muted-foreground">How {startup.name} is doing across the six validation factors.</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <Badge variant="outline">{status.data?.live ? "Live AI" : "Built-in engine"}</Badge>
          <Button onClick={recompute} disabled={busy}><Sparkles className="mr-1 h-4 w-4" /> {busy ? "Analysing…" : "Recompute"}</Button>
        </div>
      </div>

      {!score ? (
        <div className="empty-state p-10 text-center">
          <p className="font-semibold">No validation score yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Run the analysis to get your score and a factor breakdown.</p>
          <Button className="mt-4" onClick={recompute} disabled={busy}>Run analysis</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="ai-surface p-5">
              <h2 className="font-semibold">Validation score</h2>
              <div className="relative h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={62} outerRadius={84} startAngle={90} endAngle={-270} stroke="none">
                      <Cell fill="var(--color-brand)" />
                      <Cell fill="var(--color-muted)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <p className="font-display text-4xl font-bold tabular-nums">{score.score}</p>
                    <p className="text-xs text-muted-foreground">out of 100</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{score.summary}</p>
              {data.data?.scoredAt && <p className="mt-2 text-xs text-muted-foreground">Last updated {timeAgo(data.data.scoredAt)}</p>}
            </div>

            <div className="ai-surface p-5">
              <h2 className="mb-2 font-semibold">Factor breakdown</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radar} outerRadius="72%">
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Radar dataKey="value" stroke="var(--color-brand)" fill="var(--color-brand)" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card-elevated p-5">
              <h2 className="font-semibold text-success">What is working</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {score.positives.length === 0 ? <li>Not enough signal yet.</li> : score.positives.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            </div>
            <div className="card-elevated p-5">
              <h2 className="font-semibold text-warning">What to improve</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {score.concerns.length === 0 ? <li>No concerns flagged.</li> : score.concerns.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            </div>
          </div>
        </>
      )}

      <div className="ai-surface p-5">
        <h2 className="font-semibold">Recent AI runs</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data.data?.history ?? []).length === 0 && <li className="text-muted-foreground">No analyses recorded yet.</li>}
          {(data.data?.history ?? []).map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
              <span className="font-medium capitalize">{h.analysis_type.replace(/_/g, " ")}</span>
              <Badge variant="outline" className="capitalize">{h.subject_type}</Badge>
              <Badge variant="secondary">{h.provider === "llm" ? "AI" : "engine"}</Badge>
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(h.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
    </div>
  );
}
