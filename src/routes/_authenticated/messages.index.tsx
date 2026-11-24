import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { initials, timeAgo, truncate } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({
    meta: [
      { title: "Messages — StartupBridge AI" },
      { name: "description", content: "Your conversations with connected founders and investors." },
      { property: "og:title", content: "Messages — StartupBridge AI" },
      { property: "og:description", content: "Conversations with your accepted connections." },
    ],
  }),
  component: Inbox,
});

function Inbox() {
  const { userId } = useMe();

  const threads = useQuery({
    queryKey: ["threads", userId],
    enabled: !!userId,
    queryFn: async () => {
      const uid = userId!;
      const { data: conns, error: connsError } = await supabase
        .from("connections")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${uid},recipient_id.eq.${uid}`);
      if (connsError) throw new Error(connsError.message);
      const others = [...new Set((conns ?? []).map((c) => (c.requester_id === uid ? c.recipient_id : c.requester_id)))];
      const { data: people, error: peopleError } = others.length ? await supabase.from("profiles").select("id,full_name").in("id", others) : { data: [], error: null };
      if (peopleError) throw new Error(peopleError.message);
      const map = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      const withLast = await Promise.all(
        (conns ?? []).map(async (c) => {
          const { data: last, error: lastError } = await supabase
            .from("messages")
            .select("body,created_at,sender_id")
            .eq("connection_id", c.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (lastError) throw new Error(lastError.message);
          const otherId = c.requester_id === uid ? c.recipient_id : c.requester_id;
          return { id: c.id, name: map.get(otherId) ?? "Member", last };
        }),
      );
      return withLast.sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? ""));
    },
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Messages</h1>
        <p className="mt-1 text-muted-foreground">Conversations open once a connection is accepted.</p>
      </div>

      {threads.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : threads.isError ? (
        <QueryErrorState title="Conversations didn’t load" error={threads.error} onRetry={() => void threads.refetch()} />
      ) : (threads.data ?? []).length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <MessageSquare className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 font-semibold">No conversations yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Accept a request on <Link to="/connections" className="text-brand hover:underline">Connections</Link> to start chatting.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {(threads.data ?? []).map((t) => (
            <li key={t.id}>
              <Link to="/messages/$id" params={{ id: t.id }} className="card-interactive flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{initials(t.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{t.last ? truncate(t.last.body, 80) : "Say hello"}</p>
                </div>
                <span className="text-xs text-muted-foreground">{t.last ? timeAgo(t.last.created_at) : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
