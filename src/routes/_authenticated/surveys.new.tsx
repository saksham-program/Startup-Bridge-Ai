import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { CATEGORIES, QUESTION_TYPES } from "@/lib/constants";
import { createSurvey } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { errorMessage } from "@/lib/utils-app";

export const Route = createFileRoute("/_authenticated/surveys/new")({
  head: () => ({
    meta: [
      { title: "Create a survey — StartupBridge AI" },
      { name: "description", content: "Build a validation survey with choice, rating and open-ended questions." },
      { property: "og:title", content: "Create a survey — StartupBridge AI" },
      { property: "og:description", content: "Build a validation survey in minutes." },
    ],
  }),
  component: NewSurvey,
});

type QType = (typeof QUESTION_TYPES)[number]["value"];
type Q = { type: QType; prompt: string; options: string[]; required: boolean };

const blank = (): Q => ({ type: "single_choice", prompt: "", options: ["", ""], required: true });

function NewSurvey() {
  const { role, userId } = useMe();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startupId, setStartupId] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [questions, setQuestions] = useState<Q[]>([blank()]);
  const [busy, setBusy] = useState(false);

  const canCreate = role === "founder" || role === "general_user";
  const isFounder = role === "founder";

  const startups = useQuery({
    queryKey: ["my-startups-min", userId],
    enabled: !!userId && isFounder,
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("id,name").eq("founder_id", userId!);
      if (error) throw error;
      return data;
    },
  });

  if (role && !canCreate) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">Surveys are created by founders and general users</p>
        <p className="mt-1 text-sm text-muted-foreground">You can answer published surveys from the Surveys page.</p>
        <Button asChild className="mt-4"><Link to="/surveys">Back to surveys</Link></Button>
      </div>
    );
  }

  function patch(idx: number, next: Partial<Q>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...next } : q)));
  }

  async function submit(publish: boolean) {
    if (title.trim().length < 6) {
      toast.error("Give your survey a clear title (at least 6 characters).");
      return;
    }
    const cleaned = questions.map((q) => ({ ...q, prompt: q.prompt.trim(), options: q.options.map((o) => o.trim()).filter(Boolean) }));
    if (cleaned.some((q) => q.prompt.length < 4)) {
      toast.error("Every question needs a prompt.");
      return;
    }
    setBusy(true);
    try {
      const res = await createSurvey({
        data: {
          title: title.trim(),
          description: description.trim() || null,
          startup_id: isFounder ? (startupId || null) : null,
          problem_id: null,
          target_audience: { categories, location: location.trim() || null },
          publish,
          questions: cleaned,
        },
      });
      toast.success(publish ? "Survey published — respondents have been notified." : "Draft saved.");
      navigate({ to: "/surveys/$id/results", params: { id: res.id } });
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
        <h1 className="text-2xl font-bold sm:text-3xl">Create a survey</h1>
        <p className="mt-1 text-muted-foreground">Short surveys get more answers. Aim for 3–6 questions.</p>
      </div>

      <div className="card-elevated space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="t">Title</Label>
          <Input id="t" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Would you use a same-day medicine delivery service?" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="d">Description</Label>
          <Textarea id="d" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell respondents what you are validating and how long it takes." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="s">Linked startup (optional)</Label>
            <select
              id="s"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={isFounder ? startupId : ""}
              onChange={(e) => setStartupId(e.target.value)}
              disabled={!isFounder}
            >
              <option value="">None</option>
              {isFounder && (startups.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loc">Target location (optional)</Label>
            <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Pune, India" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Target interests</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategories((v) => (v.includes(c) ? v.filter((x) => x !== c) : [...v, c]))}
                aria-pressed={categories.includes(c)}
              >
                <Badge variant={categories.includes(c) ? "default" : "outline"}>{c}</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={idx} className="card-elevated space-y-3 p-5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-muted-foreground">Question {idx + 1}</p>
              {questions.length > 1 && (
                <Button variant="ghost" size="sm" onClick={() => setQuestions((qs) => qs.filter((_, i) => i !== idx))} aria-label={`Remove question ${idx + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Input value={q.prompt} onChange={(e) => patch(idx, { prompt: e.target.value })} placeholder="Ask one clear question" aria-label={`Question ${idx + 1} prompt`} />
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={q.type}
                onChange={(e) => patch(idx, { type: e.target.value as QType })}
                aria-label={`Question ${idx + 1} type`}
              >
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={q.required} onChange={(e) => patch(idx, { required: e.target.checked })} /> Required
              </label>
            </div>
            {(q.type === "single_choice" || q.type === "multiple_choice") && (
              <div className="space-y-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex gap-2">
                    <Input
                      value={o}
                      onChange={(e) => patch(idx, { options: q.options.map((x, i) => (i === oi ? e.target.value : x)) })}
                      placeholder={`Option ${oi + 1}`}
                      aria-label={`Question ${idx + 1} option ${oi + 1}`}
                    />
                    {q.options.length > 2 && (
                      <Button variant="ghost" size="icon" onClick={() => patch(idx, { options: q.options.filter((_, i) => i !== oi) })} aria-label="Remove option">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {q.options.length < 8 && (
                  <Button variant="outline" size="sm" onClick={() => patch(idx, { options: [...q.options, ""] })}>
                    <Plus className="mr-1 h-4 w-4" /> Add option
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
        {questions.length < 15 && (
          <Button variant="outline" onClick={() => setQuestions((qs) => [...qs, blank()])}>
            <Plus className="mr-1 h-4 w-4" /> Add question
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => submit(true)} disabled={busy}>{busy ? "Saving…" : "Publish survey"}</Button>
        <Button variant="outline" onClick={() => submit(false)} disabled={busy}>Save as draft</Button>
      </div>
    </div>
  );
}
