import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowUpRight, Search, Sparkles, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { INDUSTRIES, STAGES, formatINR, stageLabel } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { initials, truncate } from "@/lib/utils-app";
import { resolveStartupId } from "@/lib/startup-identity";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/discover")({
  validateSearch: z.object({ industry: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Discover startups — StartupBridge AI" },
      { name: "description", content: "Filter validated startups by industry, stage, funding need and validation score." },
      { property: "og:title", content: "Discover startups — StartupBridge AI" },
      { property: "og:description", content: "Filter validated startups by industry, stage and funding need." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Discover,
});

function Discover() {
  const { industry: selectedIndustry } = Route.useSearch();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [sort, setSort] = useState<"score" | "new">("score");
  const industry = selectedIndustry ?? "";

  const list = useQuery({
    queryKey: ["discover", industry, stage, sort],
    queryFn: async () => {
      let query = supabase.from("startups").select("*").eq("is_public", true);
      if (industry) query = query.eq("industry", industry);
      if (stage) query = query.eq("stage", stage);
      query = sort === "score" ? query.order("validation_score", { ascending: false, nullsFirst: false }) : query.order("created_at", { ascending: false });
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list.data ?? [];
    return (list.data ?? []).filter((s) =>
      [s.name, s.tagline, s.problem, s.solution, s.industry].some((v) => (v ?? "").toLowerCase().includes(needle)),
    );
  }, [list.data, q]);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand">Investor discovery</p>
        <h1 className="text-2xl font-bold sm:text-3xl">Discover startups</h1>
        <p className="mt-1 text-muted-foreground">Compare community signals, stage and funding needs in one focused view.</p>
        </div>
        <span className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand sm:grid"><WalletCards className="h-5 w-5" /></span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search startups…" className="pl-9" aria-label="Search startups" />
        </div>
        <select aria-label="Industry" className="control-surface h-10 rounded-md px-3 text-sm" value={industry} onChange={(e) => void navigate({ to: "/discover", search: e.target.value ? { industry: e.target.value } : {} })}>
          <option value="">All industries</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
        <select aria-label="Stage" className="control-surface h-10 rounded-md px-3 text-sm" value={stage} onChange={(e) => setStage(e.target.value)}>
          <option value="">All stages</option>
          {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select aria-label="Sort" className="control-surface h-10 rounded-md px-3 text-sm" value={sort} onChange={(e) => setSort(e.target.value as "score" | "new")}>
          <option value="score">Top validation score</option>
          <option value="new">Newest</option>
        </select>
      </div>

      {list.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : list.isError ? (
        <QueryErrorState title="Startups didn’t load" error={list.error} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        <div className="empty-state p-10 text-center">
          <p className="font-semibold">No startups match those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try clearing the industry or stage filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((s) => {
            const startupId = resolveStartupId(s);
            if (!startupId) return null;
            return (
            <Link key={startupId} to="/startups/$id" params={{ id: startupId }} search={{ from: "discover" }} className="card-interactive group flex min-h-56 flex-col overflow-hidden p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">{initials(s.name)}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold transition-colors group-hover:text-brand">{s.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{s.tagline}</p>
                </div>
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Problem</p>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-muted-foreground">{truncate(s.problem ?? s.description, 140)}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {s.industry && <Badge variant="secondary">{s.industry}</Badge>}
                <Badge variant="outline">{stageLabel(s.stage)}</Badge>
                {typeof s.validation_score === "number" && <Badge className="gap-1"><Sparkles className="h-3 w-3" /> {s.validation_score}/100 estimate</Badge>}
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-foreground">{formatINR(s.funding_requirement)} <ArrowUpRight className="h-3.5 w-3.5 text-brand" /></span>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
