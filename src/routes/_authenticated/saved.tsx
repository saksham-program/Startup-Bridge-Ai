import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { stageLabel } from "@/lib/constants";
import { timeAgo, truncate } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved — StartupBridge AI" },
      { name: "description", content: "Problems and startups you bookmarked for later." },
      { property: "og:title", content: "Saved — StartupBridge AI" },
      { property: "og:description", content: "Your bookmarked problems and startups." },
    ],
  }),
  component: Saved,
});

function Saved() {
  const { userId } = useMe();
  const qc = useQueryClient();

  const saved = useQuery({
    queryKey: ["saved-items", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase.from("saved_items").select("*").eq("user_id", userId!).order("created_at", { ascending: false });
      if (itemsError) throw new Error(itemsError.message);
      const problemIds = (items ?? []).filter((i) => i.item_type === "problem").map((i) => i.item_id);
      const startupIds = (items ?? []).filter((i) => i.item_type === "startup").map((i) => i.item_id);
      const [problems, startups] = await Promise.all([
        problemIds.length ? supabase.from("problems").select("id,title,description,category,upvote_count").in("id", problemIds) : Promise.resolve({ data: [], error: null }),
        startupIds.length ? supabase.from("startups").select("id,name,tagline,industry,stage,validation_score").in("id", startupIds) : Promise.resolve({ data: [], error: null }),
      ]);
      ensureOk(problems, startups);
      return {
        items: items ?? [],
        problems: new Map((problems.data ?? []).map((p) => [p.id, p])),
        startups: new Map((startups.data ?? []).map((s) => [s.id, s])),
      };
    },
  });

  async function remove(id: string) {
    await supabase.from("saved_items").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["saved-items", userId] });
  }

  const items = saved.data?.items ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Saved</h1>
        <p className="mt-1 text-muted-foreground">Everything you bookmarked, in one list.</p>
      </div>

      {saved.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : saved.isError ? (
        <QueryErrorState title="Saved items didn’t load" error={saved.error} onRetry={() => void saved.refetch()} />
      ) : items.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Bookmark className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Tap Save on any problem or startup to keep it here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const problem = it.item_type === "problem" ? saved.data?.problems.get(it.item_id) : null;
            const startup = it.item_type === "startup" ? saved.data?.startups.get(it.item_id) : null;
            if (!problem && !startup) return null;
            return (
              <li key={it.id} className="card-interactive flex items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  {problem && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{problem.category}</Badge>
                        <span className="text-xs text-muted-foreground">Saved {timeAgo(it.created_at)}</span>
                      </div>
                      <Link to="/problems/$id" params={{ id: problem.id }} className="mt-1 block font-semibold hover:text-brand">{problem.title}</Link>
                      <p className="mt-1 text-sm text-muted-foreground">{truncate(problem.description, 150)}</p>
                    </>
                  )}
                  {startup && (
                    <>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{startup.industry ?? "Startup"}</Badge>
                        <Badge variant="outline">{stageLabel(startup.stage)}</Badge>
                        <span className="text-xs text-muted-foreground">Saved {timeAgo(it.created_at)}</span>
                      </div>
                      <Link to="/startups/$id" params={{ id: startup.id }} className="mt-1 block font-semibold hover:text-brand">{startup.name}</Link>
                      <p className="mt-1 text-sm text-muted-foreground">{startup.tagline}</p>
                    </>
                  )}
                </div>
                <button onClick={() => remove(it.id)} aria-label="Remove from saved" className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
