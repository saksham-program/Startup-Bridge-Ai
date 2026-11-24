import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { sendMessage } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { errorMessage, initials, timeAgo } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — StartupBridge AI" },
      { name: "description", content: "Chat with a connected founder or investor." },
      { property: "og:title", content: "Conversation — StartupBridge AI" },
      { property: "og:description", content: "Chat with your connection." },
    ],
  }),
  component: Thread,
});

function Thread() {
  const { id } = Route.useParams();
  const { userId } = useMe();
  const qc = useQueryClient();
  const send = useServerFn(sendMessage);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const thread = useQuery({
    queryKey: ["thread", id, userId],
    enabled: !!userId,
    refetchInterval: 8000,
    queryFn: async () => {
      const { data: conn, error: connError } = await supabase.from("connections").select("*").eq("id", id).maybeSingle();
      if (connError) throw new Error(connError.message);
      if (!conn) return null;
      const otherId = conn.requester_id === userId ? conn.recipient_id : conn.requester_id;
      const [otherRes, msgsRes] = await Promise.all([
        supabase.from("profiles").select("id,full_name").eq("id", otherId).maybeSingle(),
        supabase.from("messages").select("*").eq("connection_id", id).order("created_at", { ascending: true }),
      ]);
      ensureOk(otherRes, msgsRes);
      return { conn, other: otherRes.data, messages: msgsRes.data ?? [] };
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.data?.messages.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      await send({ data: { connection_id: id, body } });
      setText("");
      await qc.invalidateQueries({ queryKey: ["thread", id] });
      qc.invalidateQueries({ queryKey: ["threads", userId] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (thread.isLoading) return <div className="space-y-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>;
  if (thread.isError && !thread.data) return <QueryErrorState title="This conversation didn’t load" error={thread.error} onRetry={() => void thread.refetch()} />;
  const t = thread.data;
  if (!t) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">Conversation not available</p>
        <Button asChild className="mt-4"><Link to="/messages">Back to messages</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col animate-fade-up">
      <div className="flex items-center gap-3 border-b pb-3">
        <Link to="/messages" aria-label="Back" className="rounded-md p-2 hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{initials(t.other?.full_name)}</span>
        <div>
          <p className="font-semibold">{t.other?.full_name ?? "Member"}</p>
          <p className="text-xs text-muted-foreground">{t.conn.status === "accepted" ? "Connected" : t.conn.status}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {t.messages.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet — say hello.</p>}
        {t.messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", mine ? "gradient-brand text-brand-foreground" : "border bg-card")}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={cn("mt-1 text-[10px]", mine ? "text-brand-foreground/70" : "text-muted-foreground")}>{timeAgo(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t pt-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" aria-label="Message" maxLength={2000} />
        <Button type="submit" disabled={busy || !text.trim()} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
