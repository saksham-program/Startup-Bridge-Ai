import { SiteBackdrop } from "@/components/brand/SiteBackdrop";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Input } from "@/components/ui/input";
import { POLICY_VERSION } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type LegalSection = {
  id: string;
  title: string;
  body?: string[];
  list?: string[];
  sub?: { title: string; body: string }[];
  numbered?: boolean;
};

export const LEGAL_LINKS = [
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/community-guidelines", label: "Community Guidelines" },
  { to: "/ai-disclaimer", label: "AI Disclaimer" },
] as const;

export function LegalPage({
  title,
  intro,
  sections,
  updated = "9 October 2026",
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
  updated?: string;
}) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return sections;
    return sections.filter((s) =>
      [
        s.title,
        ...(s.body ?? []),
        ...(s.list ?? []),
        ...(s.sub ?? []).flatMap((x) => [x.title, x.body]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(t),
    );
  }, [q, sections]);

  return (
    <div className="relative min-h-screen bg-background">
      <SiteBackdrop lines={false} />
      <header className="sticky top-0 z-20 border-b nav-glass !border-x-0 !border-t-0">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" aria-label="StartupBridge AI home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Legal documents" className="space-y-0.5">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="nav-item"
                activeProps={{ className: "bg-brand-soft text-brand" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden lg:block">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              On this page
            </p>
            <ol className="space-y-1.5 text-sm">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {s.numbered === false ? s.title : `${i + 1}. ${s.title}`}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </aside>
        <article className="glass-card page-enter min-w-0 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">Legal</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: {updated} · Version {POLICY_VERSION}
          </p>
          <p className="mt-6 leading-relaxed text-muted-foreground">{intro}</p>
          <div className="relative mt-6 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search this document"
              className="pl-9"
              aria-label="Search this document"
            />
          </div>
          <div className="mt-8 space-y-10">
            {shown.length === 0 && (
              <p className="text-sm text-muted-foreground">No sections match "{q}".</p>
            )}
            {shown.map((s) => {
              const n = sections.indexOf(s) + 1;
              return (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="text-xl font-semibold">
                    {s.numbered === false ? s.title : `${n}. ${s.title}`}
                  </h2>
                  <div className="mt-3 space-y-3 leading-relaxed text-muted-foreground">
                    {(s.body ?? []).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {s.list && s.list.length > 0 && (
                    <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
                      {s.list.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {s.sub && (
                    <div className={cn("mt-4 space-y-3 border-l-2 border-brand/30 pl-4")}>
                      {s.sub.map((x) => (
                        <div key={x.title}>
                          <h3 className="text-sm font-semibold text-foreground">{x.title}</h3>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                            {x.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <p className="mt-10 border-t pt-6 text-sm leading-relaxed text-muted-foreground">
            Read this document together with the{" "}
            {LEGAL_LINKS.map((l, i) => (
              <span key={l.to}>
                {i > 0 && (i === LEGAL_LINKS.length - 1 ? " and " : ", ")}
                <Link
                  to={l.to}
                  className="text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l.label}
                </Link>
              </span>
            ))}
            .
          </p>
        </article>
      </div>
    </div>
  );
}
