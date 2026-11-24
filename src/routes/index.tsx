import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteBackdrop } from "@/components/brand/SiteBackdrop";
import { cn } from "@/lib/utils";
import {
  ArrowRight, BrainCircuit, ClipboardList, Copy, FileText, Fingerprint, Link2, Lock, Play, Rocket,
  ShieldCheck, Sparkles, Tags, TrendingUp, UserCheck, Users, Lightbulb, Compass, LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DISCLAIMER } from "@/lib/constants";
import { useHeroParallax } from "@/components/brand/HeroScene";
import { HeroBackdrop, ProductPreview } from "@/components/brand/HeroPreview";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StartupBridge AI — Where Real Problems Become Opportunities" },
      { name: "description", content: "Connect founders, investors and real-world problems through AI-powered discovery, validation and matching." },
      { property: "og:title", content: "StartupBridge AI — Connect • Validate • Build • Grow" },
      { property: "og:description", content: "Connect founders, investors and real-world problems through AI-powered discovery, validation and matching." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const NAV = [
  { href: "#top", l: "Home" },
  { href: "#explore", l: "Explore" },
  { href: "#features", l: "Features" },
  { href: "#how", l: "How it works" },
  { href: "#about", l: "About" },
];

function SectionHead({ k, t, d }: { k: string; t: string; d?: string }) {
  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">{k}</p>
      <h2 className="mt-3 font-serif text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-tight">{t}</h2>
      {d && <p className="mt-3 text-muted-foreground">{d}</p>}
    </div>
  );
}

function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("#top");
  const heroRef = useHeroParallax();
  useEffect(() => {
    const on = () => {
      setScrolled(window.scrollY > 12);
      let cur = "#top";
      for (const n of NAV) {
        const el = document.querySelector(n.href);
        if (el && el.getBoundingClientRect().top < 140) cur = n.href;
      }
      setActive(cur);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <div id="top" className="page-enter relative min-h-screen overflow-hidden bg-background">
      <SiteBackdrop />
      <div className="sticky top-3 z-40 mx-auto max-w-7xl px-3">
        <header className={cn("nav-glass flex min-w-0 items-center justify-between gap-3 rounded-2xl px-4 py-2.5 transition-shadow duration-300", scrolled && "shadow-card-hover")}>
          <Link to="/" aria-label="StartupBridge AI home"><Logo /></Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Sections">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={cn("relative rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground", active === n.href && "text-brand")}>
                {n.l}
                {active === n.href && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-brand shadow-glow" />}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button asChild variant="ghost" className="hidden min-[400px]:inline-flex"><Link to="/auth">Sign in</Link></Button>
            <Button asChild className="gradient-cta border-0"><Link to="/get-started">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
          </div>
        </header>
      </div>

      <section ref={heroRef} className="relative -mt-[4.5rem] flex min-h-screen items-center pt-20">
      <HeroBackdrop />
      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-14 px-4 pb-20 pt-12 text-center lg:grid-cols-[1.05fr_1fr] lg:text-left">
        <div className="relative z-10 min-w-0">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border bg-card/50 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.2em] text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-glow" /> AI-POWERED STARTUP ECOSYSTEM
          </p>
          <h1 className="mt-6 animate-fade-up font-serif text-[1.95rem] font-bold leading-[1.06] tracking-tight sm:text-6xl xl:text-[4.4rem] [animation-delay:80ms]">
            Ideas meet investors. Problems find <span className="text-brand">builders.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0 [animation-delay:160ms]">
            One platform to discover real problems, validate ideas, connect with the right people and turn innovation into impact.
          </p>
          <div className="mt-9 flex animate-fade-up flex-wrap items-center justify-center gap-3 lg:justify-start [animation-delay:240ms]">
            <Button asChild size="lg" className="gradient-cta border-0"><Link to="/get-started">Get started <ArrowRight className="h-4 w-4" /></Link></Button>
            <Button asChild size="lg" variant="outline" className="glass"><a href="#how"><span className="grid h-6 w-6 place-items-center rounded-full border border-brand/50"><Play className="h-3 w-3 fill-current" /></span> See how it works</a></Button>
          </div>
          <div className="mt-9 flex animate-fade-up items-center justify-center gap-3 lg:justify-start [animation-delay:320ms]">
            <div className="flex -space-x-2" aria-hidden="true">
              {[Rocket, LineChart, Users, Lightbulb].map((I, i) => <span key={i} className="grid h-9 w-9 place-items-center rounded-full border-2 border-background bg-brand-soft text-brand"><I className="h-4 w-4" /></span>)}
            </div>
            <div className="text-left"><p className="text-sm font-semibold">Built for every side of a startup</p><p className="text-xs text-muted-foreground">Founders · Investors · Researchers · Problem owners</p></div>
          </div>
        </div>
        <div className="min-w-0 animate-fade-up text-left [animation-delay:200ms]"><ProductPreview /></div>
      </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4">
        <div className="glass-card grid grid-cols-2 gap-y-6 p-6 lg:grid-cols-4 lg:divide-x lg:divide-border">
          {[
            { icon: Users, t: "Founders", d: "Validate & build" },
            { icon: Rocket, t: "Startups", d: "Profiles & milestones" },
            { icon: FileText, t: "Real problems", d: "Posted by the community" },
            { icon: ShieldCheck, t: "Verified investors", d: "Reviewed before badges" },
          ].map((s) => (
            <div key={s.t} className="flex items-center justify-center gap-3 px-3">
              <s.icon className="h-7 w-7 shrink-0 text-brand" />
              <div className="text-left"><p className="font-display text-lg font-bold gradient-brand-text">{s.t}</p><p className="text-xs text-muted-foreground">{s.d}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section id="about" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 py-24">
        <SectionHead k="Three sides of the platform" t="Built for every part of the startup journey." d="Different goals. One ecosystem. Solve a problem, build a startup, or find the next idea worth backing." />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Rocket, t: "For Founders", d: "Discover problems, validate ideas, build startups and connect with investors.", tags: ["Idea validation", "AI insights", "Investor matching"] },
            { icon: LineChart, t: "For Investors", d: "Discover startups, evaluate opportunities and connect with founders.", tags: ["Startup discovery", "AI analysis", "Verified profiles"] },
            { icon: Users, t: "For General Users", d: "Share real-world problems, take part in surveys and help validate ideas.", tags: ["Problem Hub", "Surveys", "Community"] },
          ].map((c) => (
            <Link key={c.t} to="/get-started" className="glass-interactive group rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <span className="orb grid h-14 w-14 shrink-0 place-items-center"><c.icon className="h-6 w-6" /></span>
                <div className="flex-1"><h3 className="text-lg font-semibold">{c.t}</h3><p className="mt-1.5 text-sm text-muted-foreground">{c.d}</p></div>
                <ArrowRight className="h-4 w-4 text-brand transition-transform group-hover:translate-x-1" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">{c.tags.map((t) => <span key={t} className="rounded-full border bg-brand-soft/40 px-3 py-1 text-xs">{t}</span>)}</div>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 pb-24">
        <SectionHead k="How it works" t="From a real problem to a funded startup." />
        <ol className="relative mt-12 grid gap-6 lg:grid-cols-4">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-linear-to-r from-transparent via-brand/60 to-transparent lg:block" aria-hidden="true" />
          {[
            { icon: Compass, n: "01", t: "Discover", d: "Find real-world problems and startup opportunities." },
            { icon: ClipboardList, n: "02", t: "Validate", d: "Use surveys and AI-powered insights to understand demand." },
            { icon: Lightbulb, n: "03", t: "Build", d: "Turn validated problems into startup ideas." },
            { icon: Link2, n: "04", t: "Connect", d: "Connect founders with relevant investors." },
          ].map((s) => (
            <li key={s.t} className="relative flex gap-4 lg:block">
              <span className="orb relative z-10 grid h-14 w-14 shrink-0 place-items-center"><s.icon className="h-5 w-5" /></span>
              <div className="lg:mt-5"><p className="font-mono text-xs text-brand">{s.n}</p><h3 className="mt-1 text-lg font-semibold">{s.t}</h3><p className="mt-1 text-sm text-muted-foreground">{s.d}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section id="features" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 pb-24">
        <SectionHead k="AI capabilities" t="Intelligence woven through every step." d="AI outputs are estimates to support your judgement, never guarantees." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Tags, t: "Problem classification", d: "Categorises new problems by industry and theme." },
            { icon: Copy, t: "Duplicate detection", d: "Flags problems that look like ones already posted." },
            { icon: TrendingUp, t: "Demand signals", d: "Estimates interest from votes, comments and surveys." },
            { icon: Sparkles, t: "Idea validation", d: "Gives an estimated validation score with reasons." },
            { icon: ClipboardList, t: "Survey analysis", d: "Summarises sentiment and key themes in responses." },
            { icon: Link2, t: "Founder–investor matching", d: "Suggests investors by industry, stage and ticket." },
            { icon: LineChart, t: "Trend detection", d: "Surfaces topics gaining attention in the community." },
            { icon: BrainCircuit, t: "Recommendations", d: "Suggests next steps based on your activity." },
          ].map((f) => (
            <div key={f.t} className="glass-interactive group rounded-2xl p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand transition-transform group-hover:scale-110"><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="explore" className="relative mx-auto max-w-7xl scroll-mt-24 px-4 pb-24">
        <SectionHead k="Explore" t="A look inside the platform." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            { icon: Compass, t: "Startup Discovery", d: "Browse startups by industry and stage, with estimated validation and match scores." },
            { icon: Lightbulb, t: "Problem Hub", d: "Post, vote on and discuss real-world problems worth solving." },
            { icon: UserCheck, t: "Investor Discovery", d: "Founders see investors whose focus fits their startup." },
            { icon: Sparkles, t: "AI Insights", d: "Survey summaries, demand signals and suggested next steps." },
          ].map((e) => (
            <Link key={e.t} to="/auth" className="glass-interactive group flex items-center gap-5 rounded-2xl p-6">
              <span className="orb grid h-16 w-16 shrink-0 place-items-center"><e.icon className="h-6 w-6" /></span>
              <div className="flex-1"><h3 className="text-lg font-semibold">{e.t}</h3><p className="mt-1 text-sm text-muted-foreground">{e.d}</p></div>
              <ArrowRight className="h-4 w-4 text-brand transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 pb-24">
        <div className="glass-card grid gap-6 p-6 sm:p-10 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Trust by design</p>
            <h2 className="mt-3 font-serif text-2xl font-bold sm:text-3xl">Built for sensitive startup information.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Lock, t: "Secure data", d: "Pitch decks and documents live in private storage with time-limited access links." },
              { icon: UserCheck, t: "Role-based access", d: "Founders, investors and general users each see only what their role permits." },
              { icon: Fingerprint, t: "Privacy controls", d: "Choose what's public, block accounts and download your data at any time." },
              { icon: ShieldCheck, t: "Fraud & spam protection", d: "Rate limits, spam checks, reporting and investor verification." },
            ].map((f) => (
              <div key={f.t} className="flex gap-3">
                <f.icon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
                <div><p className="text-sm font-semibold">{f.t}</p><p className="text-sm text-muted-foreground">{f.d}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t bg-card/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2"><Logo /><p className="text-xs">© 2026 StartupBridge AI. {DISCLAIMER}</p></div>
          <nav className="flex flex-wrap gap-4">
            <Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/community-guidelines" className="hover:text-foreground">Community Guidelines</Link>
            <Link to="/ai-disclaimer" className="hover:text-foreground">AI Disclaimer</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
