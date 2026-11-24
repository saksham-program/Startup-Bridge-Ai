import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, Bookmark, FileText, Globe, Lock, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { useMediaUrl } from "@/lib/media";
import { formatINR, stageLabel } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { errorMessage, initials } from "@/lib/utils-app";
import { InvestorQA } from "@/components/InvestorQA";
import { createConnectionRequest, getStartupDocumentUrl } from "@/lib/app.functions";
import { isStartupId, startupMatchesParam } from "@/lib/startup-identity";
import { QueryErrorState } from "@/components/QueryErrorState";

const CONNECTION_RESTRICTED_MESSAGE = "Connections are restricted. General Users cannot connect with founders or investors.";
const DOCUMENTS_RESTRICTED_MESSAGE = "Documents are restricted. General Users cannot access startup documents.";

export const Route = createFileRoute("/_authenticated/startups/$id")({
  validateSearch: z.object({
    from: z.enum(["matches", "discover"]).optional(),
  }),
  head: () => ({
    meta: [
      { title: "Startup profile — StartupBridge AI" },
      { name: "description", content: "Problem, solution, traction, team and validation score for this startup." },
      { property: "og:title", content: "Startup profile — StartupBridge AI" },
      { property: "og:description", content: "Problem, solution, traction and validation score." },
    ],
  }),
  component: StartupDetail,
});

type TeamMember = { name?: string; role?: string };

function StartupDetail() {
  const { id } = Route.useParams();
  const { from } = Route.useSearch();
  const backTo = from === "matches" ? "/matches" : "/discover";
  const { userId, role, me, isLoading: meLoading } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const createConnection = useServerFn(createConnectionRequest);
  const requestDocumentUrl = useServerFn(getStartupDocumentUrl);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const connectionsRestricted = role === "general_user";
  const documentsRestricted = role === "general_user";

  const startup = useQuery({
    queryKey: ["startup", id],
    enabled: isStartupId(id),
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const founder = useQuery({
    queryKey: ["profile", startup.data?.founder_id],
    enabled: !!startup.data?.founder_id,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,full_name,bio,location,avatar_url").eq("id", startup.data!.founder_id).maybeSingle();
      return data;
    },
  });

  const extras = useQuery({
    queryKey: ["startup-extras", id, role],
    enabled: !meLoading,
    queryFn: async () => {
      const milestones = await supabase.from("milestones").select("*").eq("startup_id", id).order("due_date", { ascending: true });
      if (role === "general_user") {
        return { milestones: milestones.data ?? [], documents: [] };
      }
      const documents = await supabase.from("documents").select("*").eq("startup_id", id);
      return { milestones: milestones.data ?? [], documents: documents.data ?? [] };
    },
  });

  const connection = useQuery({
    queryKey: ["connection-with", startup.data?.founder_id, userId],
    enabled: !!userId && !!startup.data?.founder_id,
    queryFn: async () => {
      const other = startup.data!.founder_id;
      const { data } = await supabase
        .from("connections")
        .select("*")
        .or(`and(requester_id.eq.${userId},recipient_id.eq.${other}),and(requester_id.eq.${other},recipient_id.eq.${userId})`)
        .maybeSingle();
      return data;
    },
  });

  const logo = useMediaUrl(startup.data?.logo_url);

  function showConnectionRestricted() {
    toast.error(CONNECTION_RESTRICTED_MESSAGE);
  }

  function showDocumentsRestricted() {
    toast.error(DOCUMENTS_RESTRICTED_MESSAGE);
  }

  async function requestConnection() {
    if (!userId || !startup.data) return;
    if (connectionsRestricted) {
      showConnectionRestricted();
      return;
    }
    setBusy(true);
    try {
      await createConnection({
        data: {
          recipient_id: startup.data.founder_id,
          startup_id: startup.data.id,
          message: note || null,
        },
      });
      toast.success("Connection request sent.");
      setOpen(false);
      setNote("");
      qc.invalidateQueries({ queryKey: ["connection-with", startup.data.founder_id, userId] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!userId) return;
    await supabase.from("saved_items").insert({ user_id: userId, item_type: "startup", item_id: id });
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["saved-items", userId] });
  }

  async function openDeck(path: string) {
    if (documentsRestricted) {
      showDocumentsRestricted();
      return;
    }
    try {
      const url = await requestDocumentUrl({ data: { path } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(errorMessage(e, "You don't have access to this document yet."));
    }
  }

  if (!isStartupId(id)) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">This startup isn't available</p>
        <Button asChild className="mt-4"><Link to={backTo}>Discover startups</Link></Button>
      </div>
    );
  }

  if (startup.isLoading || (startup.isFetching && !startupMatchesParam(startup.data, id))) {
    return <div className="space-y-3"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-60 rounded-xl" /></div>;
  }
  if (startup.isError) return <QueryErrorState title="This startup didn’t load" error={startup.error} onRetry={() => void startup.refetch()} />;
  const s = startup.data;
  if (!s || !startupMatchesParam(s, id)) {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">This startup isn't available</p>
        <Button asChild className="mt-4"><Link to={backTo}>Discover startups</Link></Button>
      </div>
    );
  }

  const isOwner = s.founder_id === userId;
  const team = (Array.isArray(s.team) ? s.team : []) as TeamMember[];
  const conn = connection.data;

  return (
    <div className="space-y-6 animate-fade-up">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to discovery
      </Link>

      <header className="card-elevated p-6">
        <div className="flex flex-wrap items-start gap-4">
          {logo ? (
            <img src={logo} alt="" className="h-14 w-14 rounded-xl object-cover" />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-xl bg-brand-soft text-sm font-bold text-brand">{initials(s.name)}</span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold sm:text-3xl">{s.name}</h1>
            <p className="mt-1 text-muted-foreground">{s.tagline}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {s.industry && <Badge variant="secondary">{s.industry}</Badge>}
              <Badge variant="outline">{stageLabel(s.stage)}</Badge>
              {s.location && <span className="text-xs text-muted-foreground">{s.location}</span>}
              {s.website && (
                <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {typeof s.validation_score === "number" && (
              <div className="w-36">
                <p className="text-xs text-muted-foreground">Validation score</p>
                <p className="text-2xl font-bold">{s.validation_score}<span className="text-sm text-muted-foreground">/100</span></p>
                <Progress value={s.validation_score} className="mt-1" />
              </div>
            )}
          </div>
        </div>

        {!isOwner && (
          <div className="mt-5 flex flex-wrap gap-2">
            {connectionsRestricted ? (
              <Button
                variant="outline"
                className="opacity-70"
                onClick={showConnectionRestricted}
                aria-label="Request connection (restricted)"
              >
                <Lock className="mr-1 h-4 w-4" /> Request connection
              </Button>
            ) : conn?.status === "accepted" ? (
              <Button onClick={() => navigate({ to: "/messages/$id", params: { id: conn.id } })}>Message founder</Button>
            ) : conn?.status === "pending" ? (
              <Button disabled variant="outline">Request pending</Button>
            ) : (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button><Users className="mr-1 h-4 w-4" /> Request connection</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Connect with {founder.data?.full_name ?? "the founder"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Hi, I'm ${me?.profile?.full_name ?? ""} — I'd love to learn more about ${s.name}.`} />
                    <Button className="w-full" onClick={requestConnection} disabled={busy}>{busy ? "Sending…" : "Send request"}</Button>
                    <p className="text-xs text-muted-foreground">Messaging unlocks once the founder accepts.</p>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Button variant="outline" onClick={save}><Bookmark className="mr-1 h-4 w-4" /> Save</Button>
          </div>
        )}
        {isOwner && <Button asChild className="mt-5"><Link to="/my-startup">Edit in My Startup</Link></Button>}
      </header>

      {role === "investor" && !isOwner && <InvestorQA startupId={s.id} startupName={s.name} />}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card-elevated space-y-5 p-6 lg:col-span-2">
          {s.problem && <div><h2 className="font-semibold">Problem</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.problem}</p></div>}
          {s.solution && <div><h2 className="font-semibold">Solution</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.solution}</p></div>}
          {s.description && <div><h2 className="font-semibold">About</h2><p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{s.description}</p></div>}
          {s.target_users && <div><h2 className="font-semibold">Target users</h2><p className="mt-1 text-sm text-muted-foreground">{s.target_users}</p></div>}
          {s.business_model && <div><h2 className="font-semibold">Business model</h2><p className="mt-1 text-sm text-muted-foreground">{s.business_model}</p></div>}
          {s.market_info && <div><h2 className="font-semibold">Market</h2><p className="mt-1 text-sm text-muted-foreground">{s.market_info}</p></div>}
          {s.problem_id && (
            <p className="text-sm">
              Built on a community problem: <Link to="/problems/$id" params={{ id: s.problem_id }} className="text-brand hover:underline">view the original problem</Link>
            </p>
          )}
        </section>

        <aside className="space-y-4">
          <div className="card-elevated p-6">
            <h2 className="font-semibold">Funding</h2>
            <p className="mt-1 text-2xl font-bold">{formatINR(s.funding_requirement)}</p>
            <p className="text-xs text-muted-foreground">Requirement stated by the founder</p>
          </div>

          <div className="card-elevated p-6">
            <h2 className="font-semibold">Team</h2>
            {team.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">Team details not shared yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {team.map((m, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-[10px] font-bold text-brand">{initials(m.name)}</span>
                    <span><span className="font-medium">{m.name}</span>{m.role && <span className="text-muted-foreground"> · {m.role}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-elevated p-6">
            <h2 className="font-semibold">Milestones</h2>
            {(extras.data?.milestones ?? []).length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No milestones yet.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {(extras.data?.milestones ?? []).map((m) => (
                  <li key={m.id} className="flex items-start gap-2">
                    <span className={cn("mt-1.5 h-2 w-2 rounded-full", m.status === "done" ? "bg-success" : m.status === "in_progress" ? "bg-warning" : "bg-border")} />
                    <span><span className="font-medium">{m.title}</span>{m.due_date && <span className="text-muted-foreground"> · {m.due_date}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card-elevated p-6">
            <h2 className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" /> Documents</h2>
            {documentsRestricted ? (
              <button
                type="button"
                onClick={showDocumentsRestricted}
                className="mt-2 flex w-full items-start gap-3 rounded-lg border border-dashed p-3 text-left opacity-70 hover:bg-muted/50"
                aria-label="Documents (restricted)"
              >
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <span>
                  <span className="block text-sm font-medium">Documents locked</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">Restricted for General Users</span>
                </span>
              </button>
            ) : (extras.data?.documents ?? []).length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">No documents shared.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {(extras.data?.documents ?? []).map((d) => (
                  <li key={d.id}>
                    <button onClick={() => openDeck(d.storage_path)} className="text-brand hover:underline">{d.name}</button>
                    {d.is_private && <span className="ml-1 text-xs text-muted-foreground">(verified investors only)</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {role === "investor" && (
            <div className="card-elevated p-6">
              <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-brand" /> Match insight</h2>
              <p className="mt-1 text-sm text-muted-foreground">See how this startup scores against your thesis on the <Link to="/matches" className="text-brand hover:underline">Matches</Link> page.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
