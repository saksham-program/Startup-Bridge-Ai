import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { submitSurveyResponse } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/surveys/$id/")({
  head: () => ({
    meta: [
      { title: "Take a survey — StartupBridge AI" },
      { name: "description", content: "Answer a founder's validation survey and help shape a new product." },
      { property: "og:title", content: "Take a survey — StartupBridge AI" },
      { property: "og:description", content: "Answer a founder's validation survey." },
    ],
  }),
  component: TakeSurvey,
});

type Answer = string | string[] | number | null;

function TakeSurvey() {
  const { id } = Route.useParams();
  const { userId } = useMe();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const survey = useQuery({
    queryKey: ["survey", id],
    queryFn: async () => {
      const [{ data: s, error }, { data: qs }] = await Promise.all([
        supabase.from("surveys").select("*").eq("id", id).maybeSingle(),
        supabase.from("survey_questions").select("*").eq("survey_id", id).order("position"),
      ]);
      if (error) throw error;
      return { survey: s, questions: qs ?? [] };
    },
  });

  const mine = useQuery({
    queryKey: ["survey-response", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("survey_responses").select("id").eq("survey_id", id).eq("respondent_id", userId!).maybeSingle();
      return !!data;
    },
  });

  if (survey.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (survey.isError) return <QueryErrorState title="This survey didn’t load" error={survey.error} onRetry={() => void survey.refetch()} />;
  const s = survey.data?.survey;
  if (!s) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">Survey not found</p>
        <Button asChild className="mt-4"><Link to="/surveys">Back to surveys</Link></Button>
      </div>
    );
  }

  const isOwner = s.founder_id === userId;
  const alreadyAnswered = mine.data === true;
  const readOnly = isOwner || alreadyAnswered || done || s.status !== "published";

  async function submit() {
    setBusy(true);
    try {
      await submitSurveyResponse({ data: { survey_id: id, answers } });
      setDone(true);
      toast.success("Thanks! Your response was recorded.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/surveys" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Surveys
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold sm:text-3xl">{s.title}</h1>
          <Badge variant="outline" className="capitalize">{s.status}</Badge>
        </div>
        {s.description && <p className="mt-2 text-muted-foreground">{s.description}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{survey.data?.questions.length} questions · {s.response_count} responses</p>
      </div>

      {done || alreadyAnswered ? (
        <div className="card-elevated flex items-center gap-3 p-5">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <p className="text-sm">You have already answered this survey. Thanks for helping validate real ideas.</p>
        </div>
      ) : isOwner ? (
        <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted-foreground">This is your survey — here's what respondents see.</p>
          <Button asChild><Link to="/surveys/$id/results" params={{ id }}>View results</Link></Button>
        </div>
      ) : s.status !== "published" ? (
        <div className="card-elevated p-5 text-sm text-muted-foreground">This survey is not accepting responses right now.</div>
      ) : null}

      <div className="space-y-4">
        {survey.data?.questions.map((q, idx) => {
          const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
          const val = answers[q.id];
          return (
            <fieldset key={q.id} className="card-elevated space-y-3 p-5" disabled={readOnly}>
              <legend className="text-sm font-semibold">
                {idx + 1}. {q.prompt} {q.required && <span className="text-destructive">*</span>}
              </legend>

              {q.type === "single_choice" &&
                opts.map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={q.id} checked={val === o} onChange={() => setAnswers((a) => ({ ...a, [q.id]: o }))} /> {o}
                  </label>
                ))}

              {q.type === "multiple_choice" &&
                opts.map((o) => {
                  const arr = Array.isArray(val) ? val : [];
                  return (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={arr.includes(o)}
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.checked ? [...arr, o] : arr.filter((x) => x !== o) }))}
                      />{" "}
                      {o}
                    </label>
                  );
                })}

              {q.type === "rating" && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: n }))}
                      className={`h-10 w-10 rounded-md border text-sm font-semibold ${val === n ? "gradient-brand text-brand-foreground" : "bg-background"}`}
                      aria-pressed={val === n}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}

              {q.type === "yes_no" && (
                <div className="flex gap-2">
                  {["Yes", "No"].map((o) => (
                    <Button key={o} type="button" variant={val === o ? "default" : "outline"} size="sm" onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}>
                      {o}
                    </Button>
                  ))}
                </div>
              )}

              {q.type === "short_answer" && (
                <Input value={typeof val === "string" ? val : ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder="Your answer" />
              )}

              {q.type === "long_answer" && (
                <Textarea rows={4} value={typeof val === "string" ? val : ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder="Your answer" />
              )}
            </fieldset>
          );
        })}
      </div>

      {!readOnly && (
        <div className="flex gap-3">
          <Button onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit response"}</Button>
          <Button variant="outline" onClick={() => navigate({ to: "/surveys" })}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
