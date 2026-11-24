import { ArrowRight, BarChart3, FileText, Lightbulb, Link2, Rocket, Sparkles, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import mountainsImg from "@/assets/mountains.webp";
import { cn } from "@/lib/utils";

/** Parallax layer: shifts by depth × cursor offset (CSS vars --mx/--my set on the hero). */
function Depth({ d, className, children, style }: { d: number; className?: string; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className={cn("will-change-transform transition-transform duration-500 ease-out", className)} style={{ ...style, transform: `translate3d(calc(var(--mx,0) * ${d}px), calc(var(--my,0) * ${d}px), 0)` }}>
      {children}
    </div>
  );
}

/** Tracks the cursor over the hero (desktop, fine pointers only) and exposes -1..1 offsets as CSS vars. */
export function useHeroParallax() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const on = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
        el.style.setProperty("--lx", `${e.clientX - r.left}px`);
        el.style.setProperty("--ly", `${e.clientY - r.top}px`);
      });
    };
    el.addEventListener("pointermove", on);
    return () => { el.removeEventListener("pointermove", on); cancelAnimationFrame(raf); };
  }, []);
  return ref;
}

/** Full-bleed cinematic volcanic environment behind the entire hero, with atmospheric overlays. */
export function Mountains() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Depth d={-6} className="absolute inset-[-2%]">
        <img
          src={mountainsImg}
          alt=""
          className="h-full w-full object-cover object-[60%_center] opacity-60 brightness-[0.9] saturate-[0.8] md:object-center dark:opacity-100 dark:brightness-100 dark:saturate-100"
        />
      </Depth>
      {/* layered atmosphere: dark top, burgundy middle, clear centre, dark bottom fade */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, color-mix(in oklch, var(--background) 72%, transparent) 0%, color-mix(in oklch, var(--background) 35%, transparent) 22%, color-mix(in oklch, var(--burgundy, #521319) 12%, transparent) 45%, transparent 62%, color-mix(in oklch, var(--background) 45%, transparent) 84%, var(--background) 100%)" }} />
      {/* readability behind the left-hand copy */}
      <div className="absolute inset-0 hidden lg:block" style={{ background: "linear-gradient(to right, color-mix(in oklch, var(--background) 55%, transparent) 0%, transparent 50%)" }} />
      {/* AI core illuminating the environment */}
      <div className="absolute left-[72%] top-[45%] h-[60%] w-[45%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: "radial-gradient(closest-side, var(--core-glow), transparent)" }} />
      {/* soft vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 55%, color-mix(in oklch, var(--background) 60%, transparent) 100%)" }} />
    </div>
  );
}

function FloatCard({ icon: Icon, t, d, className, delay, depth }: { icon: LucideIcon; t: string; d: string; className: string; delay: string; depth: number }) {
  return (
    <Depth d={depth} className={cn("absolute z-20 hidden md:block", className)}>
      <div className="glass-card group flex w-[180px] animate-float items-start gap-2.5 rounded-2xl p-3 transition-[transform,border-color,filter] duration-300 hover:-translate-y-1 hover:border-brand/50 hover:brightness-110" style={{ animationDelay: delay }}>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg gradient-cta"><Icon className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">{t}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{d}</p>
        </div>
        <ArrowRight className="ml-auto mt-0.5 h-3 w-3 shrink-0 text-brand transition-transform group-hover:translate-x-0.5" />
      </div>
    </Depth>
  );
}

function Node({ icon: Icon, t, s, className, depth, delay }: { icon: LucideIcon; t: string; s: string; className: string; depth: number; delay: string }) {
  return (
    <Depth d={depth} className={cn("absolute z-10", className)}>
      <div className="flex animate-float flex-col items-center" style={{ animationDelay: delay }}>
        <div className="orb grid h-[72px] w-[72px] place-items-center sm:h-20 sm:w-20">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-2 text-xs font-bold sm:text-sm">{t}</p>
        <p className="text-[10px] text-muted-foreground">{s}</p>
      </div>
    </Depth>
  );
}

const TRAILS = ["M14 50 C 28 44, 36 50, 50 50", "M86 50 C 72 56, 64 50, 50 50", "M50 13 C 46 26, 50 36, 50 50", "M50 50 C 50 64, 54 74, 50 86"];

/** Compact AI ecosystem: 3D glass core, counter-rotating orbits, light trails to four nodes. */
export function OpportunityCore() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[500px]" role="img" aria-label="Founders, investors, the community and startups connected through the StartupBridge AI core">
      <Depth d={6} className="absolute inset-[8%]"><div className="h-full w-full rounded-full border border-brand/15 animate-spin-slow"><span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet shadow-glow" /></div></Depth>
      <Depth d={9} className="absolute inset-[22%]"><div className="h-full w-full rounded-full border border-dashed border-violet/30 animate-spin-rev"><span className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand" /></div></Depth>
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id="trail" x1="0" x2="1"><stop offset="0" stopColor="var(--color-brand)" stopOpacity="0" /><stop offset="1" stopColor="var(--color-violet)" /></linearGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="0.35" /></filter>
        </defs>
        {TRAILS.map((d, i) => (
          <g key={d}>
            <path d={d} stroke="var(--color-brand)" strokeOpacity="0.25" strokeWidth="0.35" fill="none" />
            <circle r="0.9" fill="var(--color-violet)" filter="url(#soft)">
              <animateMotion dur={`${3.2 + i * 0.5}s`} repeatCount="indefinite" path={d} begin={`${i * 0.7}s`} />
            </circle>
          </g>
        ))}
      </svg>
      <Depth d={12} className="absolute left-1/2 top-1/2 z-10 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2">
        <div className="core-sphere grid h-full w-full animate-[pulse-soft_6s_ease-in-out_infinite] place-items-center">
          <div className="text-center">
            <LogoMark className="mx-auto h-9 w-9" />
            <p className="mt-1.5 font-display text-sm font-bold leading-tight sm:text-base">StartupBridge</p>
            <p className="font-display text-sm font-bold text-primary dark:text-foreground sm:text-base">AI</p>
          </div>
        </div>
        <div className="mx-auto mt-3 h-3 w-3/4 rounded-[50%] bg-brand/30 blur-md" />
      </Depth>
      <Node icon={Users} t="Founders" s="Build & validate" className="left-0 top-1/2 -translate-y-1/2" depth={16} delay="0s" />
      <Node icon={BarChart3} t="Investors" s="Discover & fund" className="right-0 top-1/2 -translate-y-1/2" depth={16} delay="1.5s" />
      <Node icon={Lightbulb} t="Community" s="Share problems" className="left-1/2 top-0 -translate-x-1/2" depth={14} delay="0.8s" />
      <Node icon={Rocket} t="Startups" s="Ideas to reality" className="bottom-0 left-1/2 -translate-x-1/2" depth={14} delay="2.2s" />
      <FloatCard icon={FileText} t="Real Problems" d="Share & discover real problems" className="-left-10 top-[6%]" delay="0s" depth={22} />
      <FloatCard icon={Sparkles} t="AI Validation" d="Demand & market signals" className="-right-10 top-[6%]" delay="1.2s" depth={22} />
      <FloatCard icon={TrendingUp} t="AI Insights" d="Actionable recommendations" className="-left-10 bottom-[6%]" delay="2.1s" depth={20} />
      <FloatCard icon={Link2} t="Smart Matching" d="Connect the right people" className="-right-10 bottom-[6%]" delay="0.6s" depth={20} />
    </div>
  );
}

/** Very faint drifting particles. */
export function Particles() {
  const pts = [[8, 22], [18, 64], [27, 38], [41, 12], [55, 72], [63, 30], [74, 58], [83, 18], [91, 46], [36, 84], [70, 88], [12, 90]];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {pts.map(([x, y], i) => (
        <span key={i} className="absolute h-1 w-1 animate-float rounded-full bg-violet/60" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.45}s`, animationDuration: `${7 + (i % 4)}s`, opacity: 0.35 + (i % 3) * 0.15 }} />
      ))}
    </div>
  );
}
