import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, type ElementType, type ReactNode } from "react";
import { format } from "date-fns";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Compass,
  FileText,
  Handshake,
  Lightbulb,
  MapPin,
  MessageSquare,
  Rocket,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useMe } from "@/lib/auth";
import { getStartupReadiness } from "@/lib/dashboard-progress";
import { getModeratorDashboard, reviewModerationItem } from "@/lib/dashboard.functions";
import { getMatches } from "@/lib/ai.functions";
import { formatINR, stageLabel } from "@/lib/constants";
import { initials, timeAgo, truncate } from "@/lib/utils-app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StartupBridge AI" },
      { name: "description", content: "Your personalized StartupBridge AI workspace." },
      { property: "og:title", content: "Dashboard — StartupBridge AI" },
      { property: "og:description", content: "Your personalized StartupBridge AI workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

type Startup = Tables<"startups">;
type Survey = Tables<"surveys">;
type Connection = Tables<"connections">;
type Notification = Tables<"notifications">;
type SavedItem = Tables<"saved_items">;
type PublicStartup = Pick<Tables<"startups">, "id" | "name" | "tagline" | "industry" | "stage" | "location" | "description" | "problem" | "validation_score" | "created_at">;
type PublicProblem = Pick<Tables<"problems">, "id" | "title" | "description" | "category" | "upvote_count" | "created_at">;
type Match = Awaited<ReturnType<typeof getMatches>>["matches"][number];
type ActivityItem = { id: string; title: string; detail: string; time: string; to: string; icon: typeof Bell };

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("The dashboard data could not be loaded.");
  return result.data;
}

function uniqueInvestorMatches(matches: Match[]) {
  const best = new Map<string, Match>();
  for (const match of matches) {
    const current = best.get(match.investor.user_id);
    if (!current || match.score > current.score) best.set(match.investor.user_id, match);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 4);
}

function uniqueStartupMatches(matches: Match[]) {
  const best = new Map<string, Match>();
  for (const match of matches) {
    const current = best.get(match.startup.id);
    if (!current || match.score > current.score) best.set(match.startup.id, match);
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, 4);
}

function Dashboard() {
  const { me, role, userId, isLoading: isMeLoading, isModerator, error: meError } = useMe();
  const queryClient = useQueryClient();
  const getModeratorData = useServerFn(getModeratorDashboard);
  const reviewItem = useServerFn(reviewModerationItem);

  const dashboard = useQuery({
    queryKey: ["dashboard-workspace", userId, role, isModerator],
    enabled: Boolean(userId && (role || isModerator)),
    queryFn: async () => {
      if (!userId) throw new Error("Your account could not be identified.");
      if (isModerator) return { kind: "moderator" as const, data: await getModeratorData() };

      if (role === "founder") {
        const [startupsResult, surveysResult, surveyCountResult, connectionsResult, acceptedCountResult, pendingCountResult, notificationsResult] = await Promise.all([
          supabase.from("startups").select("*").eq("founder_id", userId).order("created_at", { ascending: false }),
          supabase.from("surveys").select("*", { count: "exact" }).eq("founder_id", userId).order("created_at", { ascending: false }).limit(20),
          supabase.from("surveys").select("id", { count: "exact", head: true }).eq("founder_id", userId),
          supabase.from("connections").select("*").or(`requester_id.eq.${userId},recipient_id.eq.${userId}`).order("created_at", { ascending: false }).limit(20),
          supabase.from("connections").select("id", { count: "exact", head: true }).or(`requester_id.eq.${userId},recipient_id.eq.${userId}`).eq("status", "accepted"),
          supabase.from("connections").select("id", { count: "exact", head: true }).eq("recipient_id", userId).eq("status", "pending"),
          supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
        ]);
        const startups = unwrap(startupsResult);
        const connections = unwrap(connectionsResult);
        if (surveyCountResult.error) throw new Error(surveyCountResult.error.message);
        if (acceptedCountResult.error) throw new Error(acceptedCountResult.error.message);
        if (pendingCountResult.error) throw new Error(pendingCountResult.error.message);
        const peerIds = [...new Set(connections.map((connection) => connection.requester_id === userId ? connection.recipient_id : connection.requester_id))];
        const startupIds = startups.map((startup) => startup.id);
        const [documentsResult, matchesResult, peersResult, publishedSurveyResult] = await Promise.all([
          startupIds.length
            ? supabase.from("documents").select("id,startup_id,doc_type").in("startup_id", startupIds)
            : Promise.resolve({ data: [], error: null }),
          // Shares the cache with the Matches page (same user-scoped key) so the server only computes matches once.
          queryClient.fetchQuery({ queryKey: ["matches", userId], queryFn: () => getMatches(), staleTime: 60_000 }),
          peerIds.length ? supabase.from("profiles").select("id,full_name").in("id", peerIds) : Promise.resolve({ data: [], error: null }),
          startupIds.length ? supabase.from("surveys").select("startup_id").eq("status", "published").in("startup_id", startupIds).limit(1000) : Promise.resolve({ data: [], error: null }),
        ]);
        if (documentsResult.error) throw new Error(documentsResult.error.message);
        if (publishedSurveyResult.error) throw new Error(publishedSurveyResult.error.message);
        if ((publishedSurveyResult.data ?? []).length >= 1000) throw new Error("Published survey readiness exceeds the available preview limit.");
        return {
          kind: "founder" as const,
          startups,
          surveys: unwrap(surveysResult),
          surveyCount: surveyCountResult.count ?? 0,
          connections,
          acceptedCount: acceptedCountResult.count ?? 0,
          pendingCount: pendingCountResult.count ?? 0,
          peerNames: new Map(unwrap(peersResult).map((profile) => [profile.id, profile.full_name])),
          publishedSurveyStartupIds: new Set((publishedSurveyResult.data ?? []).map((survey) => survey.startup_id).filter((id): id is string => id !== null)),
          notifications: unwrap(notificationsResult),
          documents: unwrap(documentsResult),
          matches: matchesResult.matches,
          verificationStatus: me?.founder?.verification_status ?? "pending",
        };
      }

      if (role === "investor") {
        const [connectionsResult, acceptedCountResult, pendingCountResult, savedResult, notificationsResult, matchesResult] = await Promise.all([
          supabase.from("connections").select("*").or(`requester_id.eq.${userId},recipient_id.eq.${userId}`).order("created_at", { ascending: false }).limit(30),
          supabase.from("connections").select("id", { count: "exact", head: true }).or(`requester_id.eq.${userId},recipient_id.eq.${userId}`).eq("status", "accepted"),
          supabase.from("connections").select("id", { count: "exact", head: true }).eq("recipient_id", userId).eq("status", "pending"),
          supabase.from("saved_items").select("*", { count: "exact" }).eq("user_id", userId).eq("item_type", "startup").order("created_at", { ascending: false }).limit(100),
          supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(8),
          // Shares the cache with the Matches page (same user-scoped key) so the server only computes matches once.
          queryClient.fetchQuery({ queryKey: ["matches", userId], queryFn: () => getMatches(), staleTime: 60_000 }),
        ]);
        const connections = unwrap(connectionsResult);
        if (acceptedCountResult.error) throw new Error(acceptedCountResult.error.message);
        if (pendingCountResult.error) throw new Error(pendingCountResult.error.message);
        const peerIds = [...new Set(connections.map((connection) => connection.requester_id === userId ? connection.recipient_id : connection.requester_id))];
        const peersResult = peerIds.length ? await supabase.from("profiles").select("id,full_name").in("id", peerIds) : { data: [], error: null };
        if (peersResult.error) throw new Error(peersResult.error.message);
        return {
          kind: "investor" as const,
          connections,
          acceptedCount: acceptedCountResult.count ?? 0,
          pendingCount: pendingCountResult.count ?? 0,
          peerNames: new Map((peersResult.data ?? []).map((profile) => [profile.id, profile.full_name])),
          saved: unwrap(savedResult),
          savedCount: savedResult.count ?? 0,
          notifications: unwrap(notificationsResult),
          matches: matchesResult.matches,
          verificationStatus: me?.investor?.verification_status ?? "pending",
        };
      }

      if (role === "general_user") {
        const recentThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const [startupsResult, recentCountResult, problemsResult, surveysResult, savedResult, notificationsResult] = await Promise.all([
          supabase.from("startups").select("id,name,tagline,industry,stage,location,description,problem,validation_score,created_at", { count: "exact" }).eq("is_public", true).order("created_at", { ascending: false }).limit(100),
          supabase.from("startups").select("id", { count: "exact", head: true }).eq("is_public", true).gte("created_at", recentThreshold),
          supabase.from("problems").select("id,title,description,category,upvote_count,created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(6),
          supabase.from("surveys").select("id,title,description,created_at", { count: "exact" }).eq("status", "published").order("published_at", { ascending: false }).limit(4),
          supabase.from("saved_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
        ]);
        if (startupsResult.error) throw new Error(startupsResult.error.message);
        if (recentCountResult.error) throw new Error(recentCountResult.error.message);
        if (problemsResult.error) throw new Error(problemsResult.error.message);
        if (surveysResult.error) throw new Error(surveysResult.error.message);
        if (savedResult.error) throw new Error(savedResult.error.message);
        if (notificationsResult.error) throw new Error(notificationsResult.error.message);
        if (surveysResult.count === null) throw new Error("Published surveys could not be counted.");
        return {
          kind: "general_user" as const,
          startups: startupsResult.data ?? [],
          startupCount: startupsResult.count ?? 0,
          industries: [...new Set((startupsResult.data ?? []).map((startup) => startup.industry).filter((industry): industry is string => Boolean(industry)))].sort(),
          industryCount: new Set((startupsResult.data ?? []).map((startup) => startup.industry).filter((industry): industry is string => Boolean(industry))).size,
          recentlyAddedCount: recentCountResult.count ?? 0,
          problems: problemsResult.data ?? [],
          problemCount: problemsResult.count ?? 0,
          surveys: surveysResult.data ?? [],
          surveyCount: surveysResult.count ?? 0,
          savedCount: savedResult.count ?? 0,
          notifications: unwrap(notificationsResult),
        };
      }

      throw new Error("No dashboard is available for this account role.");
    },
  });

  const name = me?.profile?.full_name?.trim().split(/\s+/)[0] || "there";
  const today = format(new Date(), "EEEE, MMMM d, yyyy");

  if (isMeLoading || dashboard.isLoading) return <DashboardLoading />;
  if (!me) return <DashboardError message={meError instanceof Error && meError.message ? meError.message : "Your profile is not available yet."} onRetry={() => void queryClient.invalidateQueries({ queryKey: ["me", userId] })} />;
  if (dashboard.isError) return <DashboardError message={dashboard.error.message} onRetry={() => void dashboard.refetch()} />;
  if (!dashboard.data) return <DashboardError message="Your workspace could not be loaded." onRetry={() => void dashboard.refetch()} />;

  const commonActions = role === "founder"
    ? [{ to: "/my-startup", label: "My startup", icon: Rocket }, { to: "/matches", label: "Investor matches", icon: Sparkles }, { to: "/surveys", label: "Surveys", icon: ClipboardList, variant: "outline" as const }]
    : role === "investor"
      ? [{ to: "/discover", label: "Discover startups", icon: Compass }, { to: "/matches", label: "View matches", icon: Sparkles }, { to: "/connections", label: "Connections", icon: Handshake, variant: "outline" as const }]
      : [{ to: "/discover", label: "Explore startups", icon: Compass }, { to: "/problems", label: "Problem hub", icon: Lightbulb }, { to: "/saved", label: "Saved items", icon: Bookmark, variant: "outline" as const }];
  const greeting = role ? <Welcome name={name} date={today} role={role === "general_user" ? "General user" : role} description={role === "founder" ? "Build, validate, and connect around your startup." : role === "investor" ? "Explore relevant startups and manage your investment relationships." : "Explore startups, shared problems, and opportunities to contribute."} icon={role === "founder" ? Rocket : role === "investor" ? BriefcaseBusiness : Compass} actions={commonActions} /> : null;
  const data = dashboard.data;

  if (data.kind === "moderator") {
    return <ModeratorWorkspace name={name} date={today} data={data.data} reviewItem={reviewItem} onReviewed={() => void queryClient.invalidateQueries({ queryKey: ["dashboard-workspace", userId] })} />;
  }

  if (data.kind === "founder") {
    return <FounderWorkspace name={name} date={today} greeting={greeting} userId={userId} data={data} />;
  }

  if (data.kind === "investor") {
    return <InvestorWorkspace name={name} date={today} greeting={greeting} userId={userId} data={data} />;
  }

  return <GeneralWorkspace name={name} date={today} greeting={greeting} data={data} />;
}

function DashboardLoading() {
  return (
    <div className="space-y-8" aria-label="Loading your dashboard" aria-busy="true">
      <div className="space-y-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-10 w-80 max-w-full" /><Skeleton className="h-5 w-64 max-w-full" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div>
      <div className="grid gap-5 xl:grid-cols-3"><Skeleton className="h-64 rounded-xl xl:col-span-2" /><Skeleton className="h-64 rounded-xl" /></div>
    </div>
  );
}

function DashboardError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="card-elevated mx-auto max-w-2xl p-8 text-center" role="alert">
      <CircleAlert className="mx-auto h-8 w-8 text-brand" />
      <h1 className="mt-4 text-xl font-semibold">Your workspace didn’t load</h1>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-5" onClick={onRetry}>Try again</Button>
    </section>
  );
}

function Welcome({ name, date, role, description, icon: Icon, actions }: {
  name: string;
  date: string;
  role: string;
  description: string;
  icon: ElementType;
  actions: { to: string; label: string; icon: ElementType; variant?: "default" | "outline" }[];
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/15 via-card/85 to-card/50 p-5 shadow-card sm:p-7">
      <div className="pointer-events-none absolute -right-8 -top-12 h-48 w-48 rounded-full bg-brand/10 blur-3xl" aria-hidden="true" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand"><Icon className="h-4 w-4" /> {role} workspace</div>
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome back, {name}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{date}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button key={`${action.to}-${action.label}`} asChild variant={action.variant ?? "outline"} size="sm">
              <Link to={action.to}><action.icon className="h-4 w-4" />{action.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, detail, to, linkText }: { title: string; detail?: string; to?: string; linkText?: string }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-lg font-semibold">{title}</h2>{detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}</div>
      {to && linkText && <Button asChild variant="ghost" size="sm"><Link to={to}>{linkText}<ArrowRight className="h-4 w-4" /></Link></Button>}
    </div>
  );
}

function Metric({ label, value, detail, to, icon: Icon }: { label: string; value: number | string; detail: string; to: string; icon: typeof Rocket }) {
  return (
    <Link to={to} className="card-interactive group min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Icon className="h-4 w-4" /></span><ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" /></div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold tabular-nums">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </Link>
  );
}

function EmptyPanel({ title, detail, to, action, icon: Icon = Compass }: { title: string; detail: string; to: string; action: string; icon?: typeof Compass }) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-card/35 px-5 py-8 text-center">
      <Icon className="mx-auto h-6 w-6 text-muted-foreground" />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{detail}</p>
      <Button asChild variant="outline" size="sm" className="mt-4"><Link to={to}>{action}<ArrowRight className="h-4 w-4" /></Link></Button>
    </div>
  );
}

function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">Your recent activity will appear here.</div>;
  }
  return (
    <ul className="divide-y divide-border/70">
      {items.slice(0, 6).map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary/80 text-muted-foreground"><item.icon className="h-4 w-4" /></span>
          <Link to={item.to} className="min-w-0 flex-1"><span className="block truncate text-sm font-medium hover:text-brand">{item.title}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.detail}</span></Link>
          <time className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(item.time)}</time>
        </li>
      ))}
    </ul>
  );
}

function FounderWorkspace({ name, date, greeting, userId, data }: {
  name: string;
  date: string;
  greeting: ReactNode;
  userId: string | null;
  data: {
    kind: "founder";
    startups: Startup[];
    surveys: Survey[];
    surveyCount: number;
    connections: Connection[];
    acceptedCount: number;
    pendingCount: number;
    peerNames: Map<string, string>;
    publishedSurveyStartupIds: Set<string>;
    notifications: Notification[];
    documents: { id: string; startup_id: string; doc_type: string }[];
    matches: Match[];
    verificationStatus: string;
  };
}) {
  const accepted = data.acceptedCount;
  const pending = data.pendingCount;
  const scores = data.startups.flatMap((startup) => typeof startup.validation_score === "number" ? [startup.validation_score] : []);
  const averageScore = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
  const investorMatches = uniqueInvestorMatches(data.matches);
  const hasPitchDeck = (startupId: string) => data.documents.some((document) => document.startup_id === startupId && document.doc_type === "pitch_deck");
  const readinessByStartup = data.startups.map((startup) => ({
    startup,
    readiness: getStartupReadiness(startup, hasPitchDeck(startup.id), data.publishedSurveyStartupIds.has(startup.id)),
  }));
  const nextSteps = getFounderNextSteps(data.startups, data.surveys, data.connections, userId, data.verificationStatus, investorMatches.length, readinessByStartup);
  const activities = useMemo(() => buildFounderActivity(data), [data]);

  return (
    <div className="space-y-8 animate-fade-up">
      {greeting}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="My startups" value={data.startups.length} detail="In your workspace" to="/my-startup" icon={Rocket} />
        <Metric label="Average validation" value={averageScore === null ? "—" : `${averageScore}/100`} detail={averageScore === null ? "No estimate available yet" : "AI estimate, not a guarantee"} to="/ai-insights" icon={TrendingUp} />
        <Metric label="Surveys created" value={data.surveyCount} detail="Your survey workspace" to="/surveys" icon={ClipboardList} />
        <Metric label="Connections" value={accepted} detail={`${pending} pending request${pending === 1 ? "" : "s"}`} to="/connections" icon={Handshake} />
      </div>

      <section>
        <SectionHeading title="My Startup Portfolio" detail="Your current ventures and their next readiness milestones." to="/my-startup" linkText="Manage startups" />
        {data.startups.length === 0 ? (
          <EmptyPanel title="Your startup workspace is ready" detail="Create your first startup to track validation, share your profile, and meet relevant investors." to="/my-startup" action="Create a startup" icon={Rocket} />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {readinessByStartup.map(({ startup, readiness }) => (
              <article key={startup.id} className="card-elevated min-w-0 p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-semibold text-brand">{initials(startup.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><Link to="/startups/$id" params={{ id: startup.id }} className="truncate font-semibold hover:text-brand">{startup.name}</Link><Badge variant={startup.is_public ? "secondary" : "outline"}>{startup.is_public ? "Public" : "Private"}</Badge></div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{[startup.industry, stageLabel(startup.stage), startup.location].filter(Boolean).join(" · ") || "Startup profile"}</p>
                  </div>
                  <span className="shrink-0 text-right"><span className="block text-lg font-bold tabular-nums">{readiness.percent}%</span><span className="text-[10px] text-muted-foreground">ready</span></span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {startup.validation_score !== null && <Badge variant="outline"><Sparkles className="mr-1 h-3 w-3" />{startup.validation_score}/100 estimate</Badge>}
                  <Badge variant="outline"><WalletCards className="mr-1 h-3 w-3" />Funding {formatINR(startup.funding_requirement)}</Badge>
                </div>
                <Progress value={readiness.percent} className="mt-4 h-1.5" aria-label={`${startup.name} readiness ${readiness.percent}%`} />
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {readiness.items.map((item) => <span key={item.label} className="inline-flex items-center gap-1.5"><span className={item.complete ? "text-success" : "text-muted-foreground/60"}>{item.complete ? <Check className="h-3.5 w-3.5" /> : <span aria-hidden="true">○</span>}</span>{item.label}</span>)}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm"><Link to="/startups/$id" params={{ id: startup.id }}>View startup<ArrowUpRight className="h-4 w-4" /></Link></Button>
                  <Button asChild size="sm" variant="outline"><Link to="/my-startup"><FileText className="h-4 w-4" />Edit profile & deck</Link></Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Recommended Investors" detail="The strongest current fits for your startup portfolio." to="/matches" linkText="All matches" />
        {investorMatches.length === 0 ? (
          <EmptyPanel title="No investor matches yet" detail="Add your startup’s industry, stage and funding need to improve the matching signals." to={data.startups.length ? "/my-startup" : "/my-startup"} action="Update startup profile" icon={Sparkles} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {investorMatches.map((match) => (
              <article key={match.investor.user_id} className="card-interactive min-w-0 p-4">
                <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">{initials(match.investor.full_name)}</span><div className="min-w-0"><p className="truncate font-semibold">{match.investor.full_name}</p><p className="truncate text-xs text-muted-foreground">{match.investor.firm_name || match.investor.investor_type || "Investor"}</p></div></div><span className="shrink-0 text-lg font-bold text-brand">{match.score}%</span></div>
                <p className="mt-3 text-xs text-muted-foreground">Best fit for <Link to="/startups/$id" params={{ id: match.startup.id }} className="font-medium text-foreground hover:text-brand">{match.startup.name}</Link></p>
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{match.reasons.filter((reason) => reason.matched).map((reason) => reason.label).join(" · ") || "Profile and preference fit"}</p>
                {match.investor.verification_status === "verified" && <Badge className="mt-3 gap-1"><BadgeCheck className="h-3 w-3" />Verified</Badge>}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="card-elevated min-w-0 p-5">
          <SectionHeading title="Startup readiness" detail="Based on the details and files currently saved to your workspace." />
          {data.startups.length === 0 ? <EmptyPanel title="No startup to assess" detail="Your readiness checklist will appear after you create a startup." to="/my-startup" action="Create a startup" /> : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/50 p-3"><span className="text-sm font-medium">Founder verification</span><span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground"><ShieldCheck className="h-4 w-4" />{data.verificationStatus.replaceAll("_", " ")}</span></div>
              {readinessByStartup.slice(0, 3).map(({ startup, readiness }) => <div key={startup.id} className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><Link to="/startups/$id" params={{ id: startup.id }} className="truncate font-medium hover:text-brand">{startup.name}</Link><span className="shrink-0 tabular-nums text-muted-foreground">{readiness.completed}/{readiness.total} complete</span></div><Progress value={readiness.percent} className="h-1.5" /></div>)}
              <Button asChild variant="outline" size="sm"><Link to="/verification">Review verification<ArrowRight className="h-4 w-4" /></Link></Button>
            </div>
          )}
        </section>
        <section className="card-elevated min-w-0 p-5">
          <SectionHeading title="Recommended next steps" detail="Based on your current startup and account status." />
          {nextSteps.length === 0 ? <div className="rounded-xl border border-dashed border-border/80 px-4 py-6 text-sm text-muted-foreground">You’re up to date. Check matches or connections for new activity.</div> : <ul className="space-y-2">{nextSteps.slice(0, 5).map((step) => <li key={step.label}><Link to={step.to} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/45 p-3 transition-colors hover:border-brand/40 hover:bg-brand/5"><step.icon className="h-4 w-4 shrink-0 text-brand" /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{step.label}</span><span className="block text-xs text-muted-foreground">{step.detail}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /></Link></li>)}</ul>}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-elevated min-w-0 p-5"><SectionHeading title="Connection activity" detail={`${accepted} accepted · ${pending} pending`} to="/connections" linkText="Manage" /><ConnectionList rows={data.connections.slice(0, 5)} userId={userId ?? ""} peerNames={data.peerNames} /></section>
        <section className="card-elevated min-w-0 p-5"><SectionHeading title="Recent activity" detail="Updates from your workspace." /><ActivityFeed items={activities} /></section>
      </div>
    </div>
  );
}

function getFounderNextSteps(
  startups: Startup[],
  surveys: Survey[],
  connections: Connection[],
  userId: string | null,
  verificationStatus: string,
  matchCount: number,
  readiness: { startup: Startup; readiness: ReturnType<typeof getStartupReadiness> }[],
) {
  const steps: { label: string; detail: string; to: string; icon: typeof Rocket }[] = [];
  if (startups.length === 0) steps.push({ label: "Create your startup profile", detail: "Add the venture you’re building.", to: "/my-startup", icon: Rocket });
  const incomplete = readiness.find((entry) => entry.readiness.percent < 100);
  if (incomplete) steps.push({ label: `Complete ${incomplete.startup.name}`, detail: `${incomplete.readiness.total - incomplete.readiness.completed} readiness item(s) still missing.`, to: "/my-startup", icon: ClipboardCheck });
  if (verificationStatus !== "verified") steps.push({ label: "Review founder verification", detail: `Current status: ${verificationStatus.replaceAll("_", " ")}.`, to: "/verification", icon: ShieldCheck });
  if (surveys.length === 0) steps.push({ label: "Create a validation survey", detail: "Gather structured feedback on your idea.", to: "/surveys", icon: ClipboardList });
  if (connections.some((connection) => connection.status === "pending" && connection.recipient_id === userId)) steps.push({ label: "Respond to a connection request", detail: "A request is waiting for your reply.", to: "/connections", icon: Handshake });
  if (matchCount > 0) steps.push({ label: "Review investor matches", detail: "See current investor fit and matching signals.", to: "/matches", icon: Sparkles });
  return steps;
}

function buildFounderActivity(data: { startups: Startup[]; surveys: Survey[]; connections: Connection[]; notifications: Notification[] }): ActivityItem[] {
  const items: ActivityItem[] = [
    ...data.notifications.map((notification) => ({ id: `notification-${notification.id}`, title: notification.title, detail: notification.body ?? "Notification", time: notification.created_at, to: notification.link ?? "/notifications", icon: Bell })),
    ...data.startups.map((startup) => ({ id: `startup-${startup.id}`, title: `${startup.name} profile created`, detail: startup.industry ?? "Startup portfolio", time: startup.created_at, to: `/startups/${startup.id}`, icon: Rocket })),
    ...data.surveys.map((survey) => ({ id: `survey-${survey.id}`, title: survey.title, detail: `${survey.response_count} response(s) · ${survey.status}`, time: survey.created_at, to: `/surveys/${survey.id}`, icon: ClipboardList })),
    ...data.connections.map((connection) => ({ id: `connection-${connection.id}`, title: connection.status === "accepted" ? "Connection accepted" : "Connection request", detail: connection.status.replaceAll("_", " "), time: connection.responded_at ?? connection.created_at, to: "/connections", icon: Handshake })),
  ];
  return items.sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, 6);
}

function ConnectionList({ rows, userId, peerNames }: { rows: Connection[]; userId: string; peerNames: Map<string, string> }) {
  if (rows.length === 0) return <EmptyPanel title="No connections yet" detail="Your connection requests and accepted relationships will show here." to="/matches" action="Explore matches" icon={Handshake} />;
  return (
    <ul className="divide-y divide-border/70">
      {rows.map((connection) => {
        const otherId = connection.requester_id === userId ? connection.recipient_id : connection.requester_id;
        return <li key={connection.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Users className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{peerNames.get(otherId) || "Platform member"}</p><p className="text-xs capitalize text-muted-foreground">{connection.status.replaceAll("_", " ")} · {timeAgo(connection.responded_at ?? connection.created_at)}</p></div><Badge variant={connection.status === "accepted" ? "secondary" : "outline"}>{connection.status}</Badge></li>;
      })}
    </ul>
  );
}

function InvestorWorkspace({ name, date, greeting, userId, data }: {
  name: string;
  date: string;
  greeting: React.ReactNode;
  userId: string | null;
  data: { kind: "investor"; connections: Connection[]; acceptedCount: number; pendingCount: number; peerNames: Map<string, string>; saved: SavedItem[]; savedCount: number; notifications: Notification[]; matches: Match[]; verificationStatus: string };
}) {
  const queryClient = useQueryClient();
  const { me } = useMe();
  const uniqueMatches = uniqueStartupMatches(data.matches);
  const active = data.acceptedCount;
  const pending = data.pendingCount;
  const savedIds = new Set(data.saved.map((item) => item.item_id));
  const activities: ActivityItem[] = [
    ...data.notifications.map((notification) => ({ id: `notification-${notification.id}`, title: notification.title, detail: notification.body ?? "Notification", time: notification.created_at, to: notification.link ?? "/notifications", icon: Bell })),
    ...data.saved.map((item) => ({ id: `saved-${item.id}`, title: "Startup saved", detail: "Added to your saved list", time: item.created_at, to: "/saved", icon: Bookmark })),
    ...data.connections.map((connection) => ({ id: `connection-${connection.id}`, title: connection.status === "accepted" ? "Connection accepted" : "Connection request", detail: connection.status.replaceAll("_", " "), time: connection.responded_at ?? connection.created_at, to: "/connections", icon: Handshake })),
  ].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, 6);

  async function saveStartup(startupId: string) {
    if (!userId) return;
    const { error } = await supabase.from("saved_items").upsert({ user_id: userId, item_type: "startup", item_id: startupId }, { onConflict: "user_id,item_type,item_id", ignoreDuplicates: true });
    if (error) {
      toast.error("Couldn’t save this startup", { description: error.message });
      return;
    }
    toast.success("Startup saved");
    await queryClient.invalidateQueries({ queryKey: ["dashboard-workspace", userId] });
    await queryClient.invalidateQueries({ queryKey: ["saved-items", userId] });
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {greeting}
      <section className="card-elevated flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-brand" /><h2 className="font-semibold">Investment preferences</h2></div><p className="mt-2 text-sm text-muted-foreground">{[me?.investor?.investor_type, me?.investor?.firm_name].filter(Boolean).join(" · ") || "Add your investor type and firm"}</p><div className="mt-3 flex flex-wrap gap-2">{(me?.investor?.preferred_industries ?? []).slice(0, 4).map((industry) => <Badge key={industry} variant="secondary">{industry}</Badge>)}{(me?.investor?.preferred_stages ?? []).slice(0, 3).map((stage) => <Badge key={stage} variant="outline">{stageLabel(stage)}</Badge>)}{me?.investor?.investment_min !== null && me?.investor?.investment_min !== undefined && <Badge variant="outline">Ticket {formatINR(me.investor.investment_min)} – {formatINR(me.investor.investment_max)}</Badge>}{me?.profile?.location && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{me.profile.location}</Badge>}</div></div>
        <Button asChild variant="outline" size="sm"><Link to="/profile">Edit preferences<ArrowRight className="h-4 w-4" /></Link></Button>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Recommended startups" value={data.matches.length} detail="Current preference-based matches" to="/matches" icon={Sparkles} />
        <Metric label="Saved startups" value={data.savedCount} detail="Your private saved list" to="/saved" icon={Bookmark} />
        <Metric label="Active connections" value={active} detail="Accepted relationships" to="/connections" icon={Handshake} />
        <Metric label="Pending requests" value={pending} detail="Awaiting your response" to="/connections" icon={Clock3} />
      </div>

      <section>
        <SectionHeading title="Recommended startups" detail="Actual startup profiles ranked against your current investment preferences." to="/matches" linkText="All recommendations" />
        {uniqueMatches.length === 0 ? <EmptyPanel title="No startup matches yet" detail="Review your investment preferences or browse all public startup profiles." to="/profile" action="Update preferences" icon={Sparkles} /> : (
          <div className="grid gap-4 lg:grid-cols-2">
            {uniqueMatches.map((match) => <article key={match.startup.id} className="card-elevated min-w-0 p-5">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft font-semibold text-brand">{initials(match.startup.name)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link to="/startups/$id" params={{ id: match.startup.id }} className="truncate font-semibold hover:text-brand">{match.startup.name}</Link><Badge variant="outline">{match.score}% match</Badge></div><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{match.startup.tagline || match.startup.industry || "Public startup profile"}</p></div></div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs"><Badge variant="secondary">{match.startup.industry || "Industry not set"}</Badge><Badge variant="outline">{stageLabel(match.startup.stage)}</Badge>{match.startup.location && <Badge variant="outline"><MapPin className="mr-1 h-3 w-3" />{match.startup.location}</Badge>}</div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground"><span>Funding need {formatINR(match.startup.funding_requirement)}</span>{match.startup.validation_score !== null && <span>Validation estimate {match.startup.validation_score}/100</span>}</div>
              <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">Fit: {match.reasons.filter((reason) => reason.matched).map((reason) => reason.label).join(" · ") || "See profile details"}</p>
              <div className="mt-4 flex flex-wrap gap-2"><Button asChild size="sm"><Link to="/startups/$id" params={{ id: match.startup.id }}>View startup<ArrowUpRight className="h-4 w-4" /></Link></Button><Button size="sm" variant="outline" onClick={() => void saveStartup(match.startup.id)} disabled={savedIds.has(match.startup.id)}>{savedIds.has(match.startup.id) ? <Check className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{savedIds.has(match.startup.id) ? "Saved" : "Save"}</Button><Button asChild size="sm" variant="ghost"><Link to="/connections">Connections</Link></Button></div>
            </article>)}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-elevated min-w-0 p-5"><SectionHeading title="Deal flow" detail="Stages reflect only saved startup and connection records." to="/saved" linkText="Open saved" /><DealFlow savedCount={data.savedCount} acceptedCount={active} pendingCount={pending} discoveredCount={data.matches.length} /></section>
        <section className="card-elevated min-w-0 p-5"><SectionHeading title="Connection management" detail="Recent requests and accepted relationships." to="/connections" linkText="Manage connections" /><ConnectionList rows={data.connections.slice(0, 5)} userId={userId ?? ""} peerNames={data.peerNames} /></section>
      </div>

      <section className="card-elevated min-w-0 p-5"><SectionHeading title="Recent activity" detail="Your latest saved items, requests and notifications." to="/notifications" linkText="Notifications" /><ActivityFeed items={activities} /></section>
      {data.verificationStatus !== "verified" && <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand/20 bg-brand/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-brand" /><div><p className="font-medium">Investor verification: {data.verificationStatus.replaceAll("_", " ")}</p><p className="mt-1 text-sm text-muted-foreground">Review the verification page for the current process and status.</p></div></div><Button asChild variant="outline" size="sm"><Link to="/verification">Review verification</Link></Button></section>}
    </div>
  );
}

function DealFlow({ savedCount, acceptedCount, pendingCount, discoveredCount }: { savedCount: number; acceptedCount: number; pendingCount: number; discoveredCount: number }) {
  const stages = [
    { label: "Discovered", count: discoveredCount, icon: Compass, to: "/discover", detail: "Public profiles" },
    { label: "Saved", count: savedCount, icon: Bookmark, to: "/saved", detail: "Your saved startups" },
    { label: "In conversation", count: pendingCount, icon: MessageSquare, to: "/connections", detail: "Pending requests" },
    { label: "Connected", count: acceptedCount, icon: Handshake, to: "/connections", detail: "Accepted connections" },
  ];
  return <ol className="grid gap-2 sm:grid-cols-2">{stages.map((stage) => <li key={stage.label}><Link to={stage.to} className="flex items-center gap-3 rounded-lg border border-border/70 bg-background/45 p-3 transition-colors hover:border-brand/40"><span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-soft text-brand"><stage.icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{stage.label}</span><span className="block truncate text-xs text-muted-foreground">{stage.detail}</span></span><span className="font-display text-xl font-bold tabular-nums">{stage.count}</span></Link></li>)}</ol>;
}

function GeneralWorkspace({ name, date, greeting, data }: {
  name: string;
  date: string;
  greeting: React.ReactNode;
  data: { kind: "general_user"; startups: PublicStartup[]; startupCount: number; industries: string[]; industryCount: number; recentlyAddedCount: number; problems: PublicProblem[]; problemCount: number; surveys: Pick<Survey, "id" | "title" | "description" | "created_at">[]; surveyCount: number; savedCount: number; notifications: Notification[] };
}) {
  const industries = data.industries;
  const activities: ActivityItem[] = data.notifications.map((notification) => ({ id: notification.id, title: notification.title, detail: notification.body ?? "Notification", time: notification.created_at, to: notification.link ?? "/notifications", icon: Bell }));

  return (
    <div className="space-y-8 animate-fade-up">
      {greeting}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Available startups" value={data.startupCount} detail="Public startup profiles" to="/discover" icon={Rocket} />
        <Metric label="Industries in recent listings" value={data.industryCount} detail="From the latest 100 public profiles" to="/discover" icon={Building2} />
        <Metric label="Added in 30 days" value={data.recentlyAddedCount} detail="Recent public profiles" to="/discover" icon={TrendingUp} />
        <Metric label="Problem statements" value={data.problemCount} detail="Shared with the community" to="/problems" icon={Lightbulb} />
      </div>

      <section>
        <SectionHeading title="Recently added startups" detail="Public profiles added most recently." to="/discover" linkText="Explore all" />
        {data.startups.length === 0 ? <EmptyPanel title="No public startups yet" detail="When founders publish startup profiles, they’ll appear here." to="/discover" action="Browse startups" icon={Rocket} /> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.startups.slice(0, 6).map((startup) => <article key={startup.id} className="card-interactive min-w-0 p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">{initials(startup.name)}</span><div className="min-w-0 flex-1"><Link to="/startups/$id" params={{ id: startup.id }} className="block truncate font-semibold hover:text-brand">{startup.name}</Link><p className="mt-1 truncate text-xs text-muted-foreground">{[startup.industry, stageLabel(startup.stage), startup.location].filter(Boolean).join(" · ")}</p></div></div><p className="mt-3 min-h-10 text-sm text-muted-foreground">{truncate(startup.description || startup.tagline || startup.problem, 110) || "Public startup profile"}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted-foreground">{timeAgo(startup.created_at)}</span>{startup.validation_score !== null && <Badge variant="outline"><Sparkles className="mr-1 h-3 w-3" />{startup.validation_score}/100 estimate</Badge>}</div><Button asChild variant="ghost" size="sm" className="mt-2 px-0"><Link to="/startups/$id" params={{ id: startup.id }}>Explore startup<ArrowRight className="h-4 w-4" /></Link></Button></article>)}
          </div>
        )}
      </section>

      <section>
        <SectionHeading title="Explore by industry" detail="Industries represented by currently available public startup profiles." />
        {industries.length === 0 ? <EmptyPanel title="Industry listings will appear here" detail="There are no public startup industry records to browse yet." to="/discover" action="Browse startups" icon={Building2} /> : <div className="flex flex-wrap gap-2">{industries.map((industry) => <Button key={industry} asChild variant="outline" size="sm"><Link to="/discover" search={{ industry }}>{industry}<ArrowUpRight className="h-3.5 w-3.5" /></Link></Button>)}</div>}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="card-elevated min-w-0 p-5"><SectionHeading title="Community problem statements" detail="Recently shared ideas and needs from the community." to="/problems" linkText="Explore problems" />{data.problems.length === 0 ? <EmptyPanel title="No problem statements yet" detail="Community ideas will appear here as they are shared." to="/problems" action="Explore problems" icon={Lightbulb} /> : <ul className="divide-y divide-border/70">{data.problems.map((problem) => <li key={problem.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><Lightbulb className="h-4 w-4" /></span><div className="min-w-0 flex-1"><Link to="/problems/$id" params={{ id: problem.id }} className="block truncate text-sm font-medium hover:text-brand">{problem.title}</Link><p className="mt-1 text-xs text-muted-foreground">{problem.category} · {problem.upvote_count} community vote(s)</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{truncate(problem.description, 110)}</p></div><Button asChild variant="ghost" size="icon" aria-label={`Explore ${problem.title}`}><Link to="/problems/$id" params={{ id: problem.id }}><ArrowUpRight className="h-4 w-4" /></Link></Button></li>)}</ul>}</section>
        <div className="space-y-6">
          <section className="card-elevated min-w-0 p-5"><SectionHeading title="Open surveys" detail="Published surveys currently available for responses." to="/surveys" linkText="Browse surveys" />{data.surveys.length === 0 ? <EmptyPanel title="No open surveys right now" detail="New published surveys from the community will appear here." to="/surveys" action="Check surveys" icon={ClipboardList} /> : <ul className="space-y-2">{data.surveys.map((survey) => <li key={survey.id}><Link to="/surveys/$id" params={{ id: survey.id }} className="block rounded-lg border border-border/70 bg-background/45 p-3 hover:border-brand/40"><span className="block truncate text-sm font-medium">{survey.title}</span><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{survey.description || "Help founders understand real user needs."}</span></Link></li>)}</ul>}</section>
          <section className="card-elevated min-w-0 p-5"><SectionHeading title="Your discovery list" detail={`${data.savedCount} item(s) saved to your account.`} to="/saved" linkText="Open saved" /><div className="flex flex-wrap gap-2"><Button asChild size="sm"><Link to="/discover"><Search className="h-4 w-4" />Explore startups</Link></Button><Button asChild size="sm" variant="outline"><Link to="/problems/new"><Lightbulb className="h-4 w-4" />Share a problem</Link></Button><Button asChild size="sm" variant="outline"><Link to="/saved"><Bookmark className="h-4 w-4" />Saved items</Link></Button></div></section>
        </div>
      </div>
      <section className="card-elevated min-w-0 p-5"><SectionHeading title="Recent account activity" detail="Private to your account." to="/notifications" linkText="Notifications" /><ActivityFeed items={activities} /></section>
    </div>
  );
}

function ModeratorWorkspace({ name, date, data, reviewItem, onReviewed }: {
  name: string;
  date: string;
  data: Awaited<ReturnType<typeof getModeratorDashboard>>;
  reviewItem: ReturnType<typeof useServerFn<typeof reviewModerationItem>>;
  onReviewed: () => void;
}) {
  const review = async (id: string, status: "reviewed" | "resolved" | "dismissed") => {
    try {
      await reviewItem({ data: { id, status } });
      toast.success("Report status updated");
      onReviewed();
    } catch (error) {
      toast.error("Couldn’t update this report", { description: error instanceof Error ? error.message : "Please refresh and try again." });
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      <Welcome name={name} date={date} role="Moderator" description="Review items submitted to the moderation queue." icon={ShieldAlert} actions={[{ to: "/notifications", label: "Notifications", icon: Bell, variant: "outline" }, { to: "/search", label: "Platform search", icon: Search, variant: "default" }]} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Open reports" value={data.openReports} detail="Awaiting moderator review" to="/dashboard" icon={ShieldAlert} /><Metric label="Recent reports" value={data.reports.length} detail="Showing up to eight open reports" to="/dashboard" icon={ClipboardList} /><Metric label="Role access" value="Moderator" detail="Verified for this account" to="/dashboard" icon={ShieldCheck} /></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card-elevated min-w-0 p-5 xl:col-span-2"><SectionHeading title="Reported content" detail="Only items with open status are shown." />{data.reports.length === 0 ? <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">There are no open reports.</div> : <ul className="grid gap-3 md:grid-cols-2">{data.reports.map((report) => <li key={report.id} className="rounded-xl border border-border/70 bg-background/40 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><Badge variant="outline">{report.target_type}</Badge><span className="text-xs text-muted-foreground">{timeAgo(report.created_at)}</span></div><p className="mt-3 text-sm font-semibold">{report.reason}</p><p className="mt-1 text-xs text-muted-foreground">Reporter reference {report.reporter_id.slice(0, 8)} · item {report.target_id.slice(0, 8)}</p>{report.details && <p className="mt-3 text-sm text-muted-foreground">{truncate(report.details, 240)}</p>}<div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => void review(report.id, "reviewed")}>Mark reviewed</Button><Button size="sm" onClick={() => void review(report.id, "resolved")}><Check className="h-4 w-4" />Resolve</Button><Button size="sm" variant="ghost" onClick={() => void review(report.id, "dismissed")}><X className="h-4 w-4" />Dismiss</Button></div></li>)}</ul>}</section>
      </div>
      <p className="text-xs text-muted-foreground">Verification decisions remain in the existing verification flow and are not managed from this dashboard.</p>
    </div>
  );
}
