import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Link2, ShieldCheck, XCircle } from "lucide-react";
import { getMatches } from "@/lib/ai.functions";
import { useMe } from "@/lib/auth";
import { formatINR, stageLabel } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { initials } from "@/lib/utils-app";
import { resolveStartupId } from "@/lib/startup-identity";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({
    meta: [
      { title: "Matches — StartupBridge AI" },
      { name: "description", content: "AI matching between startups and investors based on industry, stage, funding range and location." },
      { property: "og:title", content: "Matches — StartupBridge AI" },
      { property: "og:description", content: "AI matching between startups and investors." },
    ],
  }),
  component: Matches,
});

function Matches() {
  const { role, userId } = useMe();
  const q = useQuery({ queryKey: ["matches", userId], queryFn: () => getMatches(), enabled: !!userId });

  const isFounder = role === "founder";
  const raw = q.data?.matches ?? [];
  // Founders with several startups would otherwise see the same investor once per startup.
  // Show one card per investor (best-scoring startup), listing the other matched startups.
  const matches = isFounder ? groupByInvestor(raw) : raw.map((m) => ({ ...m, alsoFor: [] as { id: string; name: string; score: number }[] }));

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{isFounder ? "Investor matches" : "Startup matches"}</h1>
        <p className="mt-1 text-muted-foreground">
          Ranked by industry, stage, funding range, location and validation score. Matching is a suggestion, not an endorsement.
        </p>
      </div>

      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
      ) : q.isError ? (
        <QueryErrorState title="Matches didn’t load" error={q.error} onRetry={() => void q.refetch()} />
      ) : matches.length === 0 ? (
        <div className="card-elevated p-10 text-center">
          <Link2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-semibold">No matches yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isFounder ? "Complete your startup profile — industry, stage and funding need drive matching." : "Complete your investment preferences to see relevant startups."}
          </p>
          <Button asChild className="mt-4"><Link to={isFounder ? "/my-startup" : "/profile"}>{isFounder ? "Complete startup profile" : "Update preferences"}</Link></Button>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m, i) => {
            const startupId = resolveStartupId(m);
            return (
            <div key={`${startupId ?? m.startup.id}-${m.investor.user_id}-${i}`} className="card-elevated p-5">
              <div className="flex flex-wrap items-start gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
                  {initials(isFounder ? m.investor.full_name : m.startup.name)}
                </span>
                <div className="min-w-0 flex-1">
                  {isFounder ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{m.investor.full_name}</p>
                        {m.investor.verification_status === "verified" && (
                          <Badge className="gap-1"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {[m.investor.firm_name, m.investor.investor_type, m.investor.location].filter(Boolean).join(" · ") || "Investor"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ticket size {formatINR(m.investor.investment_min)} – {formatINR(m.investor.investment_max)} · best fit for {m.startup.name}
                      </p>
                      {m.alsoFor.length > 0 && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Also matches: {m.alsoFor.map((a) => `${a.name} (${a.score}%)`).join(", ")}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">{m.startup.name}</p>
                      <p className="text-sm text-muted-foreground">{m.startup.tagline}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {[m.startup.industry, stageLabel(m.startup.stage), m.startup.location].filter(Boolean).join(" · ")} · needs {formatINR(m.startup.funding_requirement)}
                      </p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold gradient-brand-text">{m.score}%</p>
                  <p className="text-xs text-muted-foreground">match</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {m.reasons.map((r) => (
                  <span key={r.label} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${r.matched ? "border-success/40 text-success" : "text-muted-foreground"}`}>
                    {r.matched ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {r.label}
                  </span>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {startupId ? (
                <Link
                  to="/startups/$id"
                  params={{ id: startupId }}
                  search={{ from: "matches" }}
                  className={buttonVariants({ variant: "outline" })}
                >
                  View startup
                </Link>
                ) : null}
                <Button asChild><Link to="/connections">Manage connections</Link></Button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type Match = Awaited<ReturnType<typeof getMatches>>["matches"][number];
type GroupedMatch = Match & { alsoFor: { id: string; name: string; score: number }[] };

export function groupByInvestor(list: Match[]): GroupedMatch[] {
  const byInvestor = new Map<string, Match[]>();
  for (const m of list) {
    const key = m.investor.user_id;
    const arr = byInvestor.get(key) ?? [];
    if (!arr.some((x) => x.startup.id === m.startup.id)) arr.push(m);
    byInvestor.set(key, arr);
  }
  return [...byInvestor.values()]
    .map((arr) => {
      const sorted = [...arr].sort((a, b) => b.score - a.score) as GroupedMatch[];
      const best = sorted[0]!; const rest = sorted.slice(1);
      return { ...best, alsoFor: rest.map((r) => ({ id: r.startup.id, name: r.startup.name, score: r.score })) };
    })
    .sort((a, b) => b.score - a.score) as GroupedMatch[];
}
