import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo, truncate } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/surveys/")({
  head: () => ({
    meta: [
      { title: "Surveys — StartupBridge AI" },
      { name: "description", content: "Create validation surveys or answer surveys from founders building for your needs." },
      { property: "og:title", content: "Surveys — StartupBridge AI" },
      { property: "og:description", content: "Create validation surveys or answer founder surveys." },
    ],
  }),
  component: SurveysIndex,
});

function SurveysIndex() {
  const { role, userId } = useMe();
  const isFounder = role === "founder";
  const canCreate = role === "founder" || role === "general_user";

  const surveys = useQuery({
    queryKey: ["surveys-list", role, userId],
    enabled: !!userId && !!role,
    queryFn: async () => {
      const q = isFounder
        ? supabase.from("surveys").select("*").eq("founder_id", userId!).order("created_at", { ascending: false })
        : role === "general_user"
          ? supabase.from("surveys").select("*").or(`founder_id.eq.${userId},status.eq.published`).order("created_at", { ascending: false })
          : supabase.from("surveys").select("*").eq("status", "published").order("published_at", { ascending: false });
      const { data, error } = await q.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const answered = useQuery({
    queryKey: ["my-survey-responses", userId],
    enabled: !!userId && !isFounder,
    queryFn: async () => {
      const { data, error } = await supabase.from("survey_responses").select("survey_id").eq("respondent_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.survey_id));
    },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{isFounder ? "My surveys" : "Surveys"}</h1>
          <p className="mt-1 text-muted-foreground">
            {isFounder
              ? "Validate your idea with real people and read AI-summarised results."
              : canCreate
                ? "Create your own surveys or answer published surveys from founders."
                : "Answer short surveys from founders and shape what gets built."}
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/surveys/new"><Plus className="mr-1 h-4 w-4" /> New survey</Link>
          </Button>
        )}
      </div>

      {surveys.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : surveys.isError ? (
        <QueryErrorState title="Surveys didn’t load" error={surveys.error} onRetry={() => void surveys.refetch()} />
      ) : (surveys.data ?? []).length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">{canCreate ? "No surveys yet" : "No surveys are open right now"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFounder
              ? "Create your first survey to start collecting validation data."
              : canCreate
                ? "Create a survey or check back for published surveys you can answer."
                : "Check back soon — founders publish new surveys regularly."}
          </p>
          {canCreate && (
            <Button asChild className="mt-4"><Link to="/surveys/new">Create a survey</Link></Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {(surveys.data ?? []).map((s) => {
            const done = answered.data?.has(s.id) ?? false;
            const isOwner = s.founder_id === userId;
            return (
              <div key={s.id} className="card-elevated flex flex-wrap items-center gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{s.title}</p>
                    <Badge variant={s.status === "published" ? "default" : s.status === "draft" ? "secondary" : "outline"} className="capitalize">{s.status}</Badge>
                    {done && !isOwner && <Badge variant="outline">Answered</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{truncate(s.description, 160)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {s.response_count} response{s.response_count === 1 ? "" : "s"} · {timeAgo(s.published_at ?? s.created_at)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isOwner ? (
                    <>
                      <Button variant="outline" asChild><Link to="/surveys/$id" params={{ id: s.id }}>Preview</Link></Button>
                      <Button asChild><Link to="/surveys/$id/results" params={{ id: s.id }}>Results</Link></Button>
                    </>
                  ) : (
                    <Button asChild variant={done ? "outline" : "default"}>
                      <Link to="/surveys/$id" params={{ id: s.id }}>{done ? "View" : "Take survey"}</Link>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
