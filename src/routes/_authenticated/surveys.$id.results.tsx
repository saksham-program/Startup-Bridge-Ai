import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { runSurveyAnalysis } from "@/lib/ai.functions";
import { setSurveyStatus } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/surveys/$id/results")({
  head: () => ({
    meta: [
      { title: "Survey results — StartupBridge AI" },
      { name: "description", content: "AI-summarised survey results: sentiment, demand signal, trends and charts." },
      { property: "og:title", content: "Survey results — StartupBridge AI" },
      { property: "og:description", content: "AI-summarised survey results and charts." },
    ],
  }),
  component: Results,
});

type Analysis = {
  total: number; positive: number; negative: number; neutral: number;
  sentiment: string; demand_indication: string;
  common_issues: string[]; common_suggestions: string[]; top_trends: string[]; summary: string;
  charts: { ratings: { label: string; value: number }[]; yesNo: { label: string; value: number }[]; choices: { question: string; data: { label: string; value: number }[] }[] };
};

function Chart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
          <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
          <Bar dataKey="value" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function Results() {
  const { id } = Route.useParams();
  const { userId } = useMe();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [busy, setBusy] = useState(false);

  const survey = useQuery({
    queryKey: ["survey-results", id],
    queryFn: async () => {
      const [sRes, qsRes, rsRes, storedRes] = await Promise.all([
        supabase.from("surveys").select("*").eq("id", id).maybeSingle(),
        supabase.from("survey_questions").select("*").eq("survey_id", id).order("position"),
        supabase.from("survey_responses").select("id,created_at").eq("survey_id", id),
        supabase.from("ai_analyses").select("result,created_at").eq("subject_type", "survey").eq("subject_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      ensureOk(sRes, qsRes, rsRes, storedRes);
      return { survey: sRes.data, questions: qsRes.data ?? [], responses: rsRes.data ?? [], stored: (storedRes.data?.result ?? null) as Analysis | null };
    },
  });

  const a = analysis ?? survey.data?.stored ?? null;
  const s = survey.data?.survey;

  async function analyze() {
    setBusy(true);
    try {
      const res = await runSurveyAnalysis({ data: { id } });
      setAnalysis(res.result as Analysis);
      toast.success(`Analysis ready (${res.provider === "llm" ? "AI" : "built-in engine"}).`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: "published" | "closed") {
    try {
      await setSurveyStatus({ data: { id, status } });
      toast.success(status === "published" ? "Survey published." : "Survey closed.");
      await survey.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (survey.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  if (survey.isError) return <QueryErrorState title="Survey results didn’t load" error={survey.error} onRetry={() => void survey.refetch()} />;
  if (!s || s.founder_id !== userId) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">Results are visible to the survey owner only</p>
        <Button asChild className="mt-4"><Link to="/surveys">Back to surveys</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Surveys
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold sm:text-3xl">{s.title}</h1>
            <Badge variant="outline" className="capitalize">{s.status}</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">{survey.data?.responses.length} responses · {survey.data?.questions.length} questions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {s.status === "draft" && <Button onClick={() => changeStatus("published")}>Publish</Button>}
          {s.status === "published" && <Button variant="outline" onClick={() => changeStatus("closed")}>Close survey</Button>}
          <Button onClick={analyze} disabled={busy}><Sparkles className="mr-1 h-4 w-4" /> {busy ? "Analysing…" : "Run AI analysis"}</Button>
        </div>
      </div>

      {!a ? (
        <div className="card-elevated p-10 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No analysis yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {survey.data?.responses.length === 0 ? "Share your survey to collect responses, then run the analysis." : "Run the AI analysis to see sentiment, demand and trends."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Responses", value: a.total },
              { label: "Sentiment", value: a.sentiment },
              { label: "Demand signal", value: a.demand_indication },
              { label: "Positive", value: `${a.positive}/${a.total || 1}` },
            ].map((c) => (
              <div key={c.label} className="card-elevated p-5">
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="mt-2 text-2xl font-bold capitalize">{c.value}</p>
              </div>
            ))}
          </div>

          <div className="card-elevated p-5">
            <h2 className="font-semibold">Summary</h2>
            <p className="mt-2 text-sm text-muted-foreground">{a.summary}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {a.charts?.ratings?.length > 0 && (
              <div className="card-elevated p-5">
                <h2 className="mb-3 font-semibold">Ratings</h2>
                <Chart data={a.charts.ratings} />
              </div>
            )}
            {a.charts?.yesNo?.length > 0 && (
              <div className="card-elevated p-5">
                <h2 className="mb-3 font-semibold">Yes / No</h2>
                <Chart data={a.charts.yesNo} />
              </div>
            )}
            {(a.charts?.choices ?? []).map((c) => (
              <div key={c.question} className="card-elevated p-5">
                <h2 className="mb-3 font-semibold">{c.question}</h2>
                <Chart data={c.data} />
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Top trends", items: a.top_trends },
              { title: "Common issues", items: a.common_issues },
              { title: "Suggestions", items: a.common_suggestions },
            ].map((b) => (
              <div key={b.title} className="card-elevated p-5">
                <h2 className="font-semibold">{b.title}</h2>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {(b.items ?? []).length === 0 ? <li>Not enough data yet.</li> : b.items.map((x) => <li key={x}>• {x}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
