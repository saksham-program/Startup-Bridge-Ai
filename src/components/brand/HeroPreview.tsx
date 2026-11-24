import { ArrowRight, BarChart3, Leaf, Search, SlidersHorizontal, Truck, HeartPulse, TrendingUp, type LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

function Depth({ d, className, children, style }: { d: number; className?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={cn("will-change-transform transition-transform duration-700 ease-out", className)} style={{ ...style, transform: `translate3d(calc(var(--mx,0) * ${d}px), calc(var(--my,0) * ${d}px), 0)` }}>
      {children}
    </div>
  );
}

type Rib = { d: string; w: number; op: number; cls: string; blur: number };
const RIBBONS: Rib[] = [
  { d: "M-200 820 C 200 900, 560 520, 900 560 S 1300 860, 1700 420", w: 150, op: 0.35, cls: "ribbon-drift-1", blur: 30 },
  { d: "M-200 700 C 260 760, 620 420, 980 470 S 1380 700, 1700 300", w: 70, op: 0.5, cls: "ribbon-drift-2", blur: 14 },
  { d: "M600 1000 C 820 760, 1060 640, 1260 520 S 1540 200, 1720 120", w: 110, op: 0.4, cls: "ribbon-drift-3", blur: 22 },
  { d: "M-200 980 C 300 860, 700 1000, 1100 860 S 1500 640, 1700 700", w: 90, op: 0.3, cls: "ribbon-drift-2", blur: 26 },
  { d: "M1000 -80 C 1120 160, 1360 240, 1700 180", w: 60, op: 0.35, cls: "ribbon-drift-1", blur: 18 },
];

/** Flowing light-ribbon backdrop: blurred glow, translucent body and bright edge per ribbon, each drifting slowly. */
export function HeroBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="hero-aura absolute -right-[10%] top-[10%] h-[85%] w-[70%] rounded-full blur-3xl" />
      <div className="hero-aura-2 absolute -left-[15%] bottom-[-20%] h-[60%] w-[55%] rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <Depth d={-8} className="absolute inset-0">
        <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none" style={{ opacity: "var(--rib-op)" }}>
          <defs>
            <linearGradient id="ribBody" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="var(--rib-a)" stopOpacity="0" /><stop offset=".35" stopColor="var(--rib-a)" /><stop offset=".75" stopColor="var(--rib-b)" /><stop offset="1" stopColor="var(--rib-b)" stopOpacity="0" /></linearGradient>
            <linearGradient id="ribHi" x1="0" x2="1"><stop offset="0" stopColor="var(--rib-hi)" stopOpacity="0" /><stop offset=".6" stopColor="var(--rib-hi)" /><stop offset="1" stopColor="var(--rib-hi)" stopOpacity="0" /></linearGradient>
            {RIBBONS.map((r, i) => <filter key={i} id={`rb${i}`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={r.blur} /></filter>)}
            <filter id="ribSoft"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          {RIBBONS.map((r, i) => (
            <g key={i} className={r.cls} style={{ animationDelay: `${-i * 4}s` }}>
              <path d={r.d} stroke="url(#ribBody)" strokeWidth={r.w * 1.8} filter={`url(#rb${i})`} opacity={r.op * 0.8} strokeLinecap="round" />
              <path d={r.d} stroke="url(#ribBody)" strokeWidth={r.w} opacity={r.op * 0.45} filter="url(#ribSoft)" strokeLinecap="round" />
              <path d={r.d} stroke="url(#ribHi)" strokeWidth="2" opacity={0.85} transform={`translate(0 ${-r.w / 2.4})`} />
              <path d={r.d} stroke="url(#ribBody)" strokeWidth="1.2" opacity={0.7} transform={`translate(0 ${r.w / 2.6})`} />
            </g>
          ))}
        </svg>
      </Depth>
      {[[12, 30], [22, 70], [48, 18], [58, 80], [70, 40], [84, 22], [92, 64], [36, 52], [78, 88]].map(([x, y], i) => (
        <span key={i} className="absolute h-1 w-1 animate-float rounded-full bg-brand/70" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s`, animationDuration: `${8 + (i % 4)}s`, opacity: 0.3 + (i % 3) * 0.15 }} />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />
    </div>
  );
}

const STEPS = ["Discover", "Validate", "Connect", "Grow"] as const;
const PROBLEMS: { icon: LucideIcon; t: string; d: string; tags: string[]; hot: string }[] = [
  { icon: Truck, t: "Smart urban logistics", d: "Last-mile delivery for growing cities", tags: ["Logistics", "Urban tech"], hot: "High demand" },
  { icon: Leaf, t: "Waste sorting at source", d: "AI-assisted recycling for housing societies", tags: ["Environment", "AI/ML"], hot: "Trending" },
  { icon: HeartPulse, t: "Affordable student wellbeing", d: "Accessible mental-health support on campus", tags: ["Health", "Education"], hot: "High impact" },
];

function Pane({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return <div className="mt-4"><p className="font-display text-sm font-bold">{title}</p><p className="text-[11px] text-muted-foreground">{sub}</p><div className="mt-3">{children}</div></div>;
}
const stagger = (i: number) => ({ animationDelay: `${i * 70}ms` });

function DiscoverPane() {
  return (
    <>
      <div className="mt-3 flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2.5 text-sm text-muted-foreground">
        <Search className="h-4 w-4" /> <span className="flex-1 truncate">Search real-world problems…</span> <SlidersHorizontal className="h-4 w-4" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="font-display text-sm font-bold">Featured problems</p>
        <Link to="/auth" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">View all <ArrowRight className="h-3 w-3" /></Link>
      </div>
      <ul className="mt-2.5 space-y-2">
        {PROBLEMS.map((p, i) => (
          <li key={p.t} style={stagger(i)} className="tab-in group flex items-center gap-3 rounded-xl border bg-card/70 p-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><p.icon className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{p.t}</p>
              <p className="truncate text-[11px] text-muted-foreground">{p.d}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {p.tags.map((t) => <span key={t} className="rounded-full border px-1.5 py-px text-[10px] text-muted-foreground">{t}</span>)}
                <span className="rounded-full bg-warning-soft px-1.5 py-px text-[10px] font-medium text-warning">{p.hot}</span>
              </div>
            </div>
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-transform group-hover:translate-x-0.5"><ArrowRight className="h-3.5 w-3.5" /></span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Metric({ l, v, i }: { l: string; v: string; i: number }) {
  return <div style={stagger(i)} className="tab-in rounded-xl border bg-card/70 p-2.5"><p className="text-[10px] text-muted-foreground">{l}</p><p className="mt-0.5 font-display text-base font-bold tabular-nums">{v}</p></div>;
}

function ValidatePane() {
  return (
    <Pane title="Validate your idea" sub="Test your startup idea against real-world signals (example data).">
      <div className="grid grid-cols-3 gap-2"><Metric l="Market demand" v="78%" i={0} /><Metric l="Problem severity" v="High" i={1} /><Metric l="User interest" v="1.8K" i={2} /></div>
      <div className="mt-3 flex items-end gap-1.5 rounded-xl border bg-card/60 p-3" aria-hidden="true">
        {[35, 50, 42, 64, 58, 76, 70, 88].map((h, i) => <span key={i} className="bar-grow flex-1 rounded-sm gradient-brand" style={{ height: `${h * 0.7}px`, animationDelay: `${i * 60}ms` }} />)}
      </div>
      <div className="tab-in mt-3 flex items-center justify-between rounded-xl border bg-card/70 p-3" style={stagger(3)}>
        <div><p className="text-[11px] text-muted-foreground">AI validation score (estimate)</p><p className="font-display text-xl font-bold tabular-nums">86<span className="text-xs text-muted-foreground">/100</span></p></div>
        <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success">Strong potential</span>
      </div>
    </Pane>
  );
}

const PEOPLE = [
  { n: "AJ", r: "Investor", ind: "FinTech", m: 92 },
  { n: "RK", r: "Founder", ind: "Logistics", m: 87 },
  { n: "MS", r: "Product expert", ind: "SaaS", m: 81 },
  { n: "PD", r: "Researcher", ind: "Climate", m: 76 },
];
function ConnectPane() {
  return (
    <Pane title="Find the right people" sub="Connect with founders, investors and experts who can move your idea forward (example data).">
      <ul className="space-y-2">
        {PEOPLE.map((p, i) => (
          <li key={p.n} style={stagger(i)} className="tab-in flex items-center gap-3 rounded-xl border bg-card/70 p-2.5">
            <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[11px] font-bold text-brand", i === 0 && "match-pulse")}>{p.n}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.r}</p><p className="truncate text-[11px] text-muted-foreground">{p.ind}</p></div>
            <div className="w-20 text-right"><p className="text-xs font-bold text-brand tabular-nums">{p.m}% match</p><div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-2"><div className="bar-grow h-full origin-left rounded-full gradient-brand" style={{ width: `${p.m}%`, animationName: "none" }} /></div></div>
          </li>
        ))}
      </ul>
    </Pane>
  );
}

function GrowPane() {
  return (
    <Pane title="Turn your idea into growth" sub="Track traction, opportunities and next steps (example data).">
      <div className="grid grid-cols-3 gap-2"><Metric l="Growth score" v="84" i={0} /><Metric l="Monthly growth" v="+32%" i={1} /><Metric l="Opportunities" v="24" i={2} /></div>
      <div className="mt-3 rounded-xl border bg-card/60 p-3">
        <svg viewBox="0 0 200 70" className="h-20 w-full" aria-hidden="true">
          <path d="M0 62 C 25 58, 40 50, 60 52 S 95 40, 115 34 S 160 16, 200 6" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" pathLength={200} className="line-draw" />
        </svg>
      </div>
      <p className="tab-in mt-3 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success" style={stagger(3)}><TrendingUp className="h-3 w-3" /> Momentum is increasing</p>
    </Pane>
  );
}

/** Product preview built from real UI primitives — the Discover → Validate → Connect → Grow workflow. */
export function ProductPreview() {
  const [step, setStep] = useState<(typeof STEPS)[number]>("Discover");
  const onTabKey = (e: ReactKeyboardEvent, current: (typeof STEPS)[number]) => {
    const i = STEPS.indexOf(current);
    const next = e.key === "ArrowRight" ? STEPS[(i + 1) % STEPS.length] : e.key === "ArrowLeft" ? STEPS[(i + STEPS.length - 1) % STEPS.length] : e.key === "Home" ? STEPS[0] : e.key === "End" ? STEPS[STEPS.length - 1] : undefined;
    if (!next) return;
    e.preventDefault();
    setStep(next);
    document.getElementById(`preview-tab-${next.toLowerCase()}`)?.focus();
  };
  return (
    <div className="relative mx-auto w-full max-w-[520px] [perspective:1600px] xl:mr-24" aria-label="Preview of the StartupBridge AI workspace">
      <Depth d={10} className="relative">
        <div className="preview-tilt">
          {/* back plate for depth */}
          <div className="absolute -right-4 -top-4 hidden h-full w-full rounded-[1.6rem] border border-brand/20 bg-card/30 backdrop-blur-sm sm:block" aria-hidden="true" />
          <div className="relative rounded-[1.6rem] border border-border/80 bg-card p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] sm:p-5">
            <div role="tablist" aria-label="Workflow preview" className="grid grid-cols-4 gap-1.5 rounded-xl bg-surface-2/70 p-1">
              {STEPS.map((s) => (
                <button
                  key={s}
                  id={`preview-tab-${s.toLowerCase()}`}
                  type="button"
                  role="tab"
                  aria-selected={step === s}
                  aria-controls="preview-panel"
                  tabIndex={step === s ? 0 : -1}
                  onClick={() => setStep(s)}
                  onKeyDown={(e) => onTabKey(e, s)}
                  className={cn("rounded-lg px-2 py-1.5 text-xs font-semibold transition-all duration-300 sm:text-sm", step === s ? "gradient-cta shadow-glow" : "text-muted-foreground hover:bg-card hover:text-foreground")}
                >
                  {s}
                </button>
              ))}
            </div>
            <div key={step} id="preview-panel" role="tabpanel" aria-labelledby={`preview-tab-${step.toLowerCase()}`} className="tab-in min-h-[330px]">
              {step === "Discover" ? <DiscoverPane /> : step === "Validate" ? <ValidatePane /> : step === "Connect" ? <ConnectPane /> : <GrowPane />}
              <p className="mt-3 border-t border-border/60 pt-2 text-[10px] leading-snug text-muted-foreground">
                <span className="font-semibold text-foreground/80">Product preview.</span> Names, scores and metrics shown here are illustrative sample data, not real platform results.
              </p>
            </div>
          </div>
        </div>
      </Depth>

      {/* AI market insights strip */}
      <Depth d={18} className="relative -mt-4 mx-3 sm:mx-6">
        <div className="glass-card flex items-center gap-3 rounded-2xl p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg gradient-cta"><BarChart3 className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">AI market insights <span className="text-[10px] font-medium text-muted-foreground">(illustrative)</span></p><p className="truncate text-[11px] text-muted-foreground">Estimate demand from votes, comments and surveys</p></div>
          <div className="hidden items-end gap-1 sm:flex" aria-hidden="true">
            {[30, 45, 60, 85, 100].map((h, i) => <span key={i} className="bar-grow w-2 rounded-sm gradient-brand" style={{ height: `${h * 0.32}px`, animationDelay: `${i * 90}ms` }} />)}
          </div>
        </div>
      </Depth>

      {/* floating side cards */}
      <Depth d={26} className="absolute -right-24 top-[30%] z-10 hidden w-44 min-[1600px]:block">
        <div className="glass-card animate-float rounded-2xl p-4">
          <p className="font-display text-sm font-bold leading-tight">Match with <span className="text-brand">the right investors</span></p>
          <div className="mt-3 flex -space-x-2">
            {["AJ", "RK", "MS"].map((n) => <span key={n} className="grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-brand-soft text-[10px] font-bold text-brand">{n}</span>)}
          </div>
          <Link to="/get-started" className="mt-3 flex items-center justify-center gap-1 rounded-lg gradient-cta py-1.5 text-xs font-semibold">Start matching <ArrowRight className="h-3 w-3" /></Link>
        </div>
      </Depth>
      <Depth d={22} className="absolute -right-24 bottom-[2%] z-10 hidden w-44 min-[1600px]:block">
        <div className="glass-card animate-float rounded-2xl p-4" style={{ animationDelay: "1.4s" }}>
          <p className="font-display text-sm font-bold leading-tight">Turn ideas <span className="text-brand">into reality</span></p>
          <svg viewBox="0 0 120 50" className="mt-2 h-12 w-full" aria-hidden="true">
            <path d="M0 42 C 20 40, 30 30, 45 34 S 70 38, 82 22 S 105 10, 120 4" fill="none" stroke="var(--color-brand)" strokeWidth="2.5" strokeLinecap="round" className="line-draw" />
          </svg>
        </div>
      </Depth>
    </div>
  );
}
