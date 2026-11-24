import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo, truncate } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/contributions")({
  head: () => ({
    meta: [
      { title: "My contributions — StartupBridge AI" },
      { name: "description", content: "Problems you posted, comments you wrote, surveys you answered and problems you upvoted." },
      { property: "og:title", content: "My contributions — StartupBridge AI" },
      { property: "og:description", content: "Your problems, comments, survey responses and upvotes." },
    ],
  }),
  component: Contributions,
});

function Contributions() {
  const { userId } = useMe();

  const data = useQuery({
    queryKey: ["contributions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const uid = userId!;
      const [problems, comments, responses, votes] = await Promise.all([
        supabase.from("problems").select("id,title,category,created_at,upvote_count,comment_count").eq("author_id", uid).order("created_at", { ascending: false }),
        supabase.from("comments").select("id,body,created_at,problem_id").eq("author_id", uid).order("created_at", { ascending: false }).limit(50),
        supabase.from("survey_responses").select("id,created_at,survey_id").eq("respondent_id", uid).order("created_at", { ascending: false }),
        supabase.from("votes").select("problem_id,created_at").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
      ]);
      ensureOk(problems, comments, responses, votes);
      const votedIds = (votes.data ?? []).map((v) => v.problem_id);
      const surveyIds = (responses.data ?? []).map((r) => r.survey_id);
      const commentProblemIds = (comments.data ?? []).map((c) => c.problem_id);
      const ids = [...new Set([...votedIds, ...commentProblemIds])];
      const [titles, surveys] = await Promise.all([
        ids.length ? supabase.from("problems").select("id,title").in("id", ids) : Promise.resolve({ data: [], error: null }),
        surveyIds.length ? supabase.from("surveys").select("id,title").in("id", surveyIds) : Promise.resolve({ data: [], error: null }),
      ]);
      ensureOk(titles, surveys);
      const titleMap = new Map((titles.data ?? []).map((t) => [t.id, t.title]));
      const surveyMap = new Map((surveys.data ?? []).map((s) => [s.id, s.title]));
      return {
        problems: problems.data ?? [],
        comments: (comments.data ?? []).map((c) => ({ ...c, problem_title: titleMap.get(c.problem_id) ?? "A problem" })),
        responses: (responses.data ?? []).map((r) => ({ ...r, survey_title: surveyMap.get(r.survey_id) ?? "A survey" })),
        votes: (votes.data ?? []).map((v) => ({ ...v, title: titleMap.get(v.problem_id) ?? "A problem" })),
      };
    },
  });

  if (data.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>;
  if (data.isError || !data.data) return <QueryErrorState title="Your contributions didn’t load" error={data.error} onRetry={() => void data.refetch()} />;
  const d = data.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My contributions</h1>
        <p className="mt-1 text-muted-foreground">Everything you've shared with the community.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Problems", d?.problems.length ?? 0],
          ["Comments", d?.comments.length ?? 0],
          ["Survey responses", d?.responses.length ?? 0],
          ["Upvotes given", d?.votes.length ?? 0],
        ].map(([label, value]) => (
          <div key={label as string} className="card-elevated p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="problems">
        <TabsList>
          <TabsTrigger value="problems">Problems</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="votes">Upvotes</TabsTrigger>
        </TabsList>

        <TabsContent value="problems" className="mt-4 space-y-3">
          {(d?.problems ?? []).length === 0 && <p className="text-sm text-muted-foreground">You haven't posted a problem yet. <Link to="/problems/new" className="text-brand hover:underline">Post one</Link>.</p>}
          {(d?.problems ?? []).map((p) => (
            <div key={p.id} className="card-interactive p-4">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{p.category}</Badge>
                <span className="text-xs text-muted-foreground">{timeAgo(p.created_at)}</span>
              </div>
              <Link to="/problems/$id" params={{ id: p.id }} className="mt-1 block font-semibold hover:text-brand">{p.title}</Link>
              <p className="mt-1 text-xs text-muted-foreground">{p.upvote_count} upvotes · {p.comment_count} comments</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="comments" className="mt-4 space-y-3">
          {(d?.comments ?? []).length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          {(d?.comments ?? []).map((c) => (
            <div key={c.id} className="card-interactive p-4">
              <Link to="/problems/$id" params={{ id: c.problem_id }} className="text-sm font-semibold hover:text-brand">{c.problem_title}</Link>
              <p className="mt-1 text-sm text-muted-foreground">{truncate(c.body, 200)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="surveys" className="mt-4 space-y-3">
          {(d?.responses ?? []).length === 0 && <p className="text-sm text-muted-foreground">You haven't answered a survey yet. <Link to="/surveys" className="text-brand hover:underline">Browse surveys</Link>.</p>}
          {(d?.responses ?? []).map((r) => (
            <div key={r.id} className="card-interactive p-4">
              <p className="font-semibold">{r.survey_title}</p>
              <p className="mt-1 text-xs text-muted-foreground">Answered {timeAgo(r.created_at)}</p>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="votes" className="mt-4 space-y-3">
          {(d?.votes ?? []).length === 0 && <p className="text-sm text-muted-foreground">No upvotes yet.</p>}
          {(d?.votes ?? []).map((v) => (
            <div key={v.problem_id} className="card-interactive p-4">
              <Link to="/problems/$id" params={{ id: v.problem_id }} className="font-semibold hover:text-brand">{v.title}</Link>
              <p className="mt-1 text-xs text-muted-foreground">Upvoted {timeAgo(v.created_at)}</p>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
