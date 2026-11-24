import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, Bookmark, Lightbulb, MessageSquare, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { CATEGORIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { errorMessage, timeAgo, truncate } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/problems/")({
  head: () => ({
    meta: [
      { title: "Problem Hub — StartupBridge AI" },
      { name: "description", content: "Browse real-world problems shared by the community, upvote what matters and comment with insight." },
      { property: "og:title", content: "Problem Hub — StartupBridge AI" },
      { property: "og:description", content: "Browse, upvote and discuss real-world problems worth solving." },
    ],
  }),
  component: ProblemsPage,
});

type Sort = "new" | "top" | "discussed";

function ProblemsPage() {
  const { userId } = useMe();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [sort, setSort] = useState<Sort>("new");

  const list = useQuery({
    queryKey: ["problems", cat, sort],
    queryFn: async () => {
      let query = supabase.from("problems").select("*");
      if (cat) query = query.eq("category", cat);
      query = sort === "top"
        ? query.order("upvote_count", { ascending: false })
        : sort === "discussed"
          ? query.order("comment_count", { ascending: false })
          : query.order("created_at", { ascending: false });
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const mine = useQuery({
    queryKey: ["my-votes-saves", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [votes, saves] = await Promise.all([
        supabase.from("votes").select("problem_id").eq("user_id", userId!),
        supabase.from("saved_items").select("item_id").eq("user_id", userId!).eq("item_type", "problem"),
      ]);
      return {
        votes: new Set((votes.data ?? []).map((v) => v.problem_id)),
        saves: new Set((saves.data ?? []).map((s) => s.item_id)),
      };
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list.data ?? [];
    return (list.data ?? []).filter(
      (p) =>
        p.title.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(needle)),
    );
  }, [list.data, q]);

  async function toggleVote(id: string, voted: boolean) {
    if (!userId) return;
    try {
      if (voted) {
        const { error } = await supabase.from("votes").delete().eq("user_id", userId).eq("problem_id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("votes").insert({ user_id: userId, problem_id: id });
        if (error) throw error;
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["my-votes-saves", userId] }),
        qc.invalidateQueries({ queryKey: ["problems"] }),
      ]);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function toggleSave(id: string, saved: boolean) {
    if (!userId) return;
    try {
      if (saved) {
        await supabase.from("saved_items").delete().eq("user_id", userId).eq("item_type", "problem").eq("item_id", id);
      } else {
        await supabase.from("saved_items").insert({ user_id: userId, item_type: "problem", item_id: id });
      }
      toast.success(saved ? "Removed from saved" : "Saved");
      qc.invalidateQueries({ queryKey: ["my-votes-saves", userId] });
      qc.invalidateQueries({ queryKey: ["saved-items", userId] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Community signal</p>
          <h1 className="text-2xl font-bold sm:text-3xl">Problem Hub</h1>
          <p className="mt-1 text-muted-foreground">Real problems shared by the community. Upvote what matters, discuss the rest.</p>
        </div>
        <Button asChild><Link to="/problems/new"><Plus className="mr-1 h-4 w-4" /> Post a problem</Link></Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search problems, tags…" className="pl-9" aria-label="Search problems" />
        </div>
        <select aria-label="Category" className="control-surface h-10 rounded-md px-3 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Sort" className="control-surface h-10 rounded-md px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="new">Newest</option>
          <option value="top">Most upvoted</option>
          <option value="discussed">Most discussed</option>
        </select>
      </div>

      {list.isLoading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      ) : list.isError ? (
        <QueryErrorState title="Problems didn’t load" error={list.error} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <div className="empty-state p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand"><Lightbulb className="h-6 w-6" /></span>
          <p className="font-semibold">No problems found</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search, or be the first to post one.</p>
          <Button asChild className="mt-4"><Link to="/problems/new">Post a problem</Link></Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const voted = mine.data?.votes.has(p.id) ?? false;
            const saved = mine.data?.saves.has(p.id) ?? false;
            return (
              <li key={p.id} className="card-interactive flex gap-4 overflow-hidden p-4 sm:p-5">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => toggleVote(p.id, voted)}
                    aria-label={voted ? "Remove upvote" : "Upvote"}
                    aria-pressed={voted}
                    className={cn("grid h-9 w-9 place-items-center rounded-lg border transition-colors", voted ? "border-brand bg-brand-soft text-brand" : "hover:bg-accent")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <span className="text-sm font-semibold">{p.upvote_count}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{p.category}</Badge>
                    {p.location && <span className="text-xs text-muted-foreground">{p.location}</span>}
                    <span className="text-xs text-muted-foreground">· {timeAgo(p.created_at)}</span>
                  </div>
                  <Link to="/problems/$id" params={{ id: p.id }} className="mt-2 block font-semibold leading-snug hover:text-brand">{p.title}</Link>
                  <p className="mt-1 text-sm text-muted-foreground">{truncate(p.description, 180)}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {p.comment_count}</span>
                    <button onClick={() => toggleSave(p.id, saved)} className={cn("inline-flex items-center gap-1 hover:text-foreground", saved && "text-brand")}>
                      <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
                    </button>
                    {(p.tags ?? []).slice(0, 3).map((t) => <span key={t}>#{t}</span>)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
