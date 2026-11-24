import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — StartupBridge AI" },
      { name: "description", content: "Connection requests, messages, survey invites and AI analysis updates in one place." },
      { property: "og:title", content: "Notifications — StartupBridge AI" },
      { property: "og:description", content: "All your StartupBridge AI activity updates." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { userId } = useMe();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  async function markAll() {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId!).is("read_at", null);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  }

  async function markOne(id: string) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  const unread = (list.data ?? []).filter((n) => !n.read_at).length;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-muted-foreground">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && <Button variant="outline" onClick={markAll}><CheckCheck className="mr-1 h-4 w-4" /> Mark all read</Button>}
      </div>

      {list.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : list.isError ? (
        <QueryErrorState title="Notifications didn’t load" error={list.error} onRetry={() => void list.refetch()} />
      ) : (list.data ?? []).length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Activity on your problems, surveys and connections will show up here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((n) => {
            const body = (
              <div className="flex items-start gap-3">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-border" : "bg-brand")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className={cn("rounded-lg border p-4 transition-colors", !n.read_at && "bg-brand-soft/40")} onClick={() => !n.read_at && markOne(n.id)}>
                {n.link ? <Link to={n.link} className="block">{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
