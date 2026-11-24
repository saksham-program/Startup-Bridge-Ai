import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowUp, Bookmark, Flag, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { runProblemAnalysis } from "@/lib/ai.functions";
import { submitReport } from "@/lib/app.functions";
import { REPORT_REASONS } from "@/lib/constants";
import { useMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { errorMessage, initials, timeAgo } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/problems/$id")({
  head: () => ({
    meta: [
      { title: "Problem details — StartupBridge AI" },
      { name: "description", content: "Read the full problem, community discussion and AI analysis of demand and duplicates." },
      { property: "og:title", content: "Problem details — StartupBridge AI" },
      { property: "og:description", content: "Full problem, discussion and AI analysis." },
    ],
  }),
  component: ProblemDetail,
});

type Analysis = {
  category?: string;
  keywords?: string[];
  demand?: string;
  summary?: string;
  duplicates?: { id: string; title: string; similarity: number }[];
  suggestions?: string[];
};

function ProblemDetail() {
  const { id } = Route.useParams();
  const { userId } = useMe();
  const qc = useQueryClient();
  const analyze = useServerFn(runProblemAnalysis);
  const report = useServerFn(submitReport);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [details, setDetails] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  const problem = useQuery({
    queryKey: ["problem", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("problems").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const author = useQuery({
    queryKey: ["profile", problem.data?.author_id],
    enabled: !!problem.data?.author_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,avatar_url,location").eq("id", problem.data!.author_id).maybeSingle();
      return data;
    },
  });

  const comments = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data, error: commentsError } = await supabase.from("comments").select("*").eq("problem_id", id).order("created_at", { ascending: true });
      if (commentsError) throw new Error(commentsError.message);
      const ids = [...new Set((data ?? []).map((c) => c.author_id))];
      const { data: people, error: peopleError } = ids.length ? await supabase.from("profiles").select("id,full_name").in("id", ids) : { data: [], error: null };
      if (peopleError) throw new Error(peopleError.message);
      const map = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return (data ?? []).map((c) => ({ ...c, author_name: map.get(c.author_id) ?? "Member" }));
    },
  });

  const analysis = useQuery({
    queryKey: ["problem-analysis", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_analyses")
        .select("result,provider,created_at")
        .eq("subject_type", "problem")
        .eq("subject_id", id)
        .eq("analysis_type", "problem_analysis")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const myVote = useQuery({
    queryKey: ["vote", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("votes").select("id").eq("problem_id", id).eq("user_id", userId!).maybeSingle();
      return !!data;
    },
  });

  const mySave = useQuery({
    queryKey: ["save", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("saved_items").select("id").eq("item_id", id).eq("item_type", "problem").eq("user_id", userId!).maybeSingle();
      return !!data;
    },
  });

  const imageUrl = useMediaUrl(problem.data?.image_url);

  async function toggleVote() {
    if (!userId) return;
    try {
      if (myVote.data) await supabase.from("votes").delete().eq("problem_id", id).eq("user_id", userId);
      else await supabase.from("votes").insert({ problem_id: id, user_id: userId });
      qc.invalidateQueries({ queryKey: ["vote", id, userId] });
      qc.invalidateQueries({ queryKey: ["problem", id] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function toggleSave() {
    if (!userId) return;
    if (mySave.data) await supabase.from("saved_items").delete().eq("item_id", id).eq("item_type", "problem").eq("user_id", userId);
    else await supabase.from("saved_items").insert({ item_id: id, item_type: "problem", user_id: userId });
    qc.invalidateQueries({ queryKey: ["save", id, userId] });
    qc.invalidateQueries({ queryKey: ["saved-items", userId] });
    toast.success(mySave.data ? "Removed from saved" : "Saved");
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || comment.trim().length < 2) return;
    setBusy(true);
    const { error } = await supabase.from("comments").insert({ problem_id: id, author_id: userId, body: comment.trim() });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", id] });
    qc.invalidateQueries({ queryKey: ["problem", id] });
  }

  async function runAi() {
    setBusy(true);
    try {
      await analyze({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["problem-analysis", id] });
      toast.success("AI analysis updated");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function sendReport() {
    try {
      await report({ data: { target_type: "problem", target_id: id, reason: reason as (typeof REPORT_REASONS)[number], details: details || null } });
      toast.success("Report submitted. Our team will review it.");
      setReportOpen(false);
      setDetails("");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (problem.isLoading) return <div className="space-y-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;
  if (problem.isError) return <QueryErrorState title="This problem didn’t load" error={problem.error} onRetry={() => void problem.refetch()} />;
  const p = problem.data;
  if (!p) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">This problem isn't available</p>
        <Button asChild className="mt-4"><Link to="/problems">Back to Problem Hub</Link></Button>
      </div>
    );
  }

  const a = (analysis.data?.result ?? null) as Analysis | null;

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to="/problems" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Problem Hub
      </Link>

      <article className="card-elevated p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{p.category}</Badge>
          {p.frequency && <Badge variant="outline">{p.frequency}</Badge>}
          {p.location && <span className="text-xs text-muted-foreground">{p.location}</span>}
          <span className="text-xs text-muted-foreground">· {timeAgo(p.created_at)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{p.title}</h1>
        <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">{initials(author.data?.full_name)}</span>
          {author.data?.full_name ?? "Member"}
        </div>
        {imageUrl && <img src={imageUrl} alt="" className="mt-4 max-h-80 w-full rounded-lg object-cover" />}
        <p className="mt-4 whitespace-pre-wrap leading-relaxed">{p.description}</p>
        {p.who_faces && <p className="mt-3 text-sm"><span className="font-semibold">Who faces it: </span>{p.who_faces}</p>}
        {(p.tags ?? []).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">{(p.tags ?? []).map((t) => <Badge key={t} variant="outline">#{t}</Badge>)}</div>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant={myVote.data ? "default" : "outline"} onClick={toggleVote}>
            <ArrowUp className="mr-1 h-4 w-4" /> {p.upvote_count} Upvote{myVote.data ? "d" : ""}
          </Button>
          <Button variant="outline" onClick={toggleSave}>
            <Bookmark className={cn("mr-1 h-4 w-4", mySave.data && "fill-current")} /> {mySave.data ? "Saved" : "Save"}
          </Button>
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-muted-foreground"><Flag className="mr-1 h-4 w-4" /> Report</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Report this problem</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <select aria-label="Reason" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)}>
                  {REPORT_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <Textarea rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add any details (optional)" />
                <Button onClick={sendReport} className="w-full">Submit report</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </article>

      <section className="card-elevated p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-brand" /> AI analysis</h2>
          <Button size="sm" variant="outline" onClick={runAi} disabled={busy}>{busy ? "Analysing…" : a ? "Re-run" : "Run analysis"}</Button>
        </div>
        {!a ? (
          <p className="mt-3 text-sm text-muted-foreground">No analysis yet. Run it to see suggested category, keywords, demand signal and possible duplicates.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Suggested category</p>
              <p className="mt-1 font-semibold">{a.category ?? "—"}</p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Demand signal</p>
              <p className="mt-1 font-semibold capitalize">{a.demand ?? "—"}</p>
            </div>
            {a.summary && (
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Summary</p>
                <p className="mt-1 text-sm">{a.summary}</p>
              </div>
            )}
            {(a.keywords ?? []).length > 0 && (
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">{(a.keywords ?? []).map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}</div>
              </div>
            )}
            {(a.duplicates ?? []).length > 0 && (
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Similar problems</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {(a.duplicates ?? []).map((d) => (
                    <li key={d.id}>
                      <Link to="/problems/$id" params={{ id: d.id }} className="text-brand hover:underline">{d.title}</Link>
                      <span className="text-muted-foreground"> · {Math.round(d.similarity * 100)}% similar</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(a.suggestions ?? []).length > 0 && (
              <div className="rounded-lg border p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Ideas to explore</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{(a.suggestions ?? []).map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {analysis.data?.provider === "llm" ? "Generated with AI." : "Generated with the built-in analysis engine."} Insights are suggestions, not guarantees.
            </p>
          </div>
        )}
      </section>

      <section className="card-elevated p-6">
        <h2 className="text-lg font-semibold">Discussion ({p.comment_count})</h2>
        <form onSubmit={addComment} className="mt-4 space-y-2">
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Share your experience or a suggestion…" />
          <Button type="submit" disabled={busy || comment.trim().length < 2}>Post comment</Button>
        </form>
        <ul className="mt-6 space-y-4">
          {(comments.data ?? []).map((c) => (
            <li key={c.id} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand">{initials(c.author_name)}</span>
              <div className="min-w-0">
                <p className="text-sm"><span className="font-semibold">{c.author_name}</span> <span className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</span></p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
              </div>
            </li>
          ))}
          {comments.isError ? (
            <li role="alert" className="text-sm text-muted-foreground">
              Comments couldn’t be loaded. <button type="button" className="font-medium text-brand hover:underline" onClick={() => void comments.refetch()}>Try again</button>
            </li>
          ) : (comments.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">No comments yet — start the conversation.</li>}
        </ul>
      </section>
    </div>
  );
}
