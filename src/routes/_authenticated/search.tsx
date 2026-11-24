import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { stageLabel } from "@/lib/constants";
import { timeAgo, truncate } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { ensureOk } from "@/lib/supabase-helpers";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search — StartupBridge AI" },
      { name: "description", content: "Search problems, startups, surveys and people across StartupBridge AI." },
      { property: "og:title", content: "Search — StartupBridge AI" },
      { property: "og:description", content: "Search problems, startups, surveys and people." },
    ],
  }),
  component: SearchPage,
});

type Tab = "all" | "problems" | "startups" | "surveys" | "people";
const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "problems", label: "Problems" },
  { key: "startups", label: "Startups" },
  { key: "surveys", label: "Surveys" },
  { key: "people", label: "People" },
];

function SearchPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const term = q.trim();

  const results = useQuery({
    queryKey: ["search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const like = `%${term}%`;
      const [problems, startups, surveys, people] = await Promise.all([
        supabase.from("problems").select("id,title,description,category,upvote_count,created_at").or(`title.ilike.${like},description.ilike.${like}`).limit(20),
        supabase.from("startups").select("id,name,tagline,industry,stage,validation_score").eq("is_public", true).or(`name.ilike.${like},tagline.ilike.${like},problem.ilike.${like}`).limit(20),
        supabase.from("surveys").select("id,title,description,response_count").eq("status", "published").or(`title.ilike.${like},description.ilike.${like}`).limit(20),
        supabase.from("profiles").select("id,full_name,bio,location").eq("is_public", true).or(`full_name.ilike.${like},bio.ilike.${like}`).limit(20),
      ]);
      ensureOk(problems, startups, surveys, people);
      return { problems: problems.data ?? [], startups: startups.data ?? [], surveys: surveys.data ?? [], people: people.data ?? [] };
    },
  });

  const show = (k: Tab) => tab === "all" || tab === k;
  const r = results.data;
  const empty = r && r.problems.length + r.startups.length + r.surveys.length + r.people.length === 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Search</h1>
        <p className="mt-1 text-muted-foreground">Look across problems, startups, surveys and people.</p>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search StartupBridge AI…" className="pl-9" aria-label="Search" autoFocus />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)} aria-pressed={tab === t.key}>
            <Badge variant={tab === t.key ? "default" : "outline"}>{t.label}</Badge>
          </button>
        ))}
      </div>

      {term.length < 2 ? (
        <div className="card-elevated p-10 text-center text-sm text-muted-foreground">Type at least two characters to search.</div>
      ) : results.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : results.isError ? (
        <QueryErrorState title="Search failed" error={results.error} onRetry={() => void results.refetch()} />
      ) : empty ? (
        <div className="card-elevated p-10 text-center">
          <p className="font-semibold">Nothing found for “{term}”</p>
          <p className="mt-1 text-sm text-muted-foreground">Try a different word or a broader term.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {show("problems") && (r?.problems.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Problems</h2>
              {r!.problems.map((p) => (
                <Link key={p.id} to="/problems/$id" params={{ id: p.id }} className="card-interactive block p-4">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{truncate(p.description, 140)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{p.category} · {p.upvote_count} upvotes · {timeAgo(p.created_at)}</p>
                </Link>
              ))}
            </section>
          )}

          {show("startups") && (r?.startups.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Startups</h2>
              {r!.startups.map((s) => (
                <Link key={s.id} to="/startups/$id" params={{ id: s.id }} className="card-interactive block p-4">
                  <p className="font-medium">{s.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.tagline}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {[s.industry, stageLabel(s.stage)].filter(Boolean).join(" · ")}
                    {typeof s.validation_score === "number" ? ` · ${s.validation_score}/100` : ""}
                  </p>
                </Link>
              ))}
            </section>
          )}

          {show("surveys") && (r?.surveys.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">Surveys</h2>
              {r!.surveys.map((s) => (
                <Link key={s.id} to="/surveys/$id" params={{ id: s.id }} className="card-interactive block p-4">
                  <p className="font-medium">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{truncate(s.description, 140)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{s.response_count} responses</p>
                </Link>
              ))}
            </section>
          )}

          {show("people") && (r?.people.length ?? 0) > 0 && (
            <section className="space-y-3">
              <h2 className="font-semibold">People</h2>
              {r!.people.map((p) => (
                <div key={p.id} className="card-elevated p-4">
                  <p className="font-medium">{p.full_name}</p>
                  {p.bio && <p className="mt-1 text-sm text-muted-foreground">{truncate(p.bio, 140)}</p>}
                  {p.location && <p className="mt-2 text-xs text-muted-foreground">{p.location}</p>}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
