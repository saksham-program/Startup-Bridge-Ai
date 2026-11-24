import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, MessageSquare, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { errorMessage, initials, timeAgo } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({
    meta: [
      { title: "Connections — StartupBridge AI" },
      { name: "description", content: "Accept or decline connection requests and open conversations with your network." },
      { property: "og:title", content: "Connections — StartupBridge AI" },
      { property: "og:description", content: "Manage requests and your network." },
    ],
  }),
  component: Connections,
});

function Connections() {
  const { userId } = useMe();
  const qc = useQueryClient();

  const data = useQuery({
    queryKey: ["connections", userId],
    enabled: !!userId,
    queryFn: async () => {
      const uid = userId!;
      const { data: conns, error: connsError } = await supabase
        .from("connections")
        .select("*")
        .or(`requester_id.eq.${uid},recipient_id.eq.${uid}`)
        .order("created_at", { ascending: false });
      if (connsError) throw new Error(connsError.message);
      const others = [...new Set((conns ?? []).map((c) => (c.requester_id === uid ? c.recipient_id : c.requester_id)))];
      const { data: people, error: peopleError } = others.length ? await supabase.from("profiles").select("id,full_name,bio,location").in("id", others) : { data: [], error: null };
      if (peopleError) throw new Error(peopleError.message);
      const map = new Map((people ?? []).map((p) => [p.id, p]));
      return (conns ?? []).map((c) => {
        const otherId = c.requester_id === uid ? c.recipient_id : c.requester_id;
        return { ...c, incoming: c.recipient_id === uid, other: map.get(otherId) ?? null };
      });
    },
  });

  async function respond(id: string, status: "accepted" | "rejected") {
    try {
      const { error } = await supabase.from("connections").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(status === "accepted" ? "Connection accepted — you can message now." : "Request declined.");
      qc.invalidateQueries({ queryKey: ["connections", userId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const rows = data.data ?? [];
  const incoming = rows.filter((c) => c.status === "pending" && c.incoming);
  const sent = rows.filter((c) => c.status === "pending" && !c.incoming);
  const accepted = rows.filter((c) => c.status === "accepted");

  function Card({ c, actions }: { c: (typeof rows)[number]; actions?: boolean }) {
    return (
      <li className="card-interactive flex flex-wrap items-center gap-4 p-4">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{initials(c.other?.full_name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{c.other?.full_name ?? "Member"}</p>
          <p className="text-xs text-muted-foreground">{c.other?.location ?? ""} · {timeAgo(c.created_at)}</p>
          {c.message && <p className="mt-1 text-sm text-muted-foreground">“{c.message}”</p>}
        </div>
        {actions ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => respond(c.id, "accepted")}><Check className="mr-1 h-4 w-4" /> Accept</Button>
            <Button size="sm" variant="outline" onClick={() => respond(c.id, "rejected")}><X className="mr-1 h-4 w-4" /> Decline</Button>
          </div>
        ) : c.status === "accepted" ? (
          <Button size="sm" asChild><Link to="/messages/$id" params={{ id: c.id }}><MessageSquare className="mr-1 h-4 w-4" /> Message</Link></Button>
        ) : (
          <Badge variant="secondary">Pending</Badge>
        )}
      </li>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Connections</h1>
        <p className="mt-1 text-muted-foreground">Messaging unlocks only after both sides agree to connect.</p>
      </div>

      {data.isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : data.isError ? (
        <QueryErrorState title="Connections didn’t load" error={data.error} onRetry={() => void data.refetch()} />
      ) : (
        <Tabs defaultValue="requests">
          <TabsList>
            <TabsTrigger value="requests">Requests {incoming.length > 0 && `(${incoming.length})`}</TabsTrigger>
            <TabsTrigger value="network">My network {accepted.length > 0 && `(${accepted.length})`}</TabsTrigger>
            <TabsTrigger value="sent">Sent</TabsTrigger>
          </TabsList>
          <TabsContent value="requests" className="mt-4">
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending requests.</p>
            ) : (
              <ul className="space-y-3">{incoming.map((c) => <Card key={c.id} c={c} actions />)}</ul>
            )}
          </TabsContent>
          <TabsContent value="network" className="mt-4">
            {accepted.length === 0 ? (
              <div className="card-elevated p-10 text-center">
                <Users className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 font-semibold">No connections yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Browse <Link to="/discover" className="text-brand hover:underline">startups</Link> or your <Link to="/matches" className="text-brand hover:underline">matches</Link> to start.</p>
              </div>
            ) : (
              <ul className="space-y-3">{accepted.map((c) => <Card key={c.id} c={c} />)}</ul>
            )}
          </TabsContent>
          <TabsContent value="sent" className="mt-4">
            {sent.length === 0 ? <p className="text-sm text-muted-foreground">No outgoing requests.</p> : <ul className="space-y-3">{sent.map((c) => <Card key={c.id} c={c} />)}</ul>}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
