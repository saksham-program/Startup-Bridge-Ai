import { Link, useNavigate } from "@tanstack/react-router";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Bookmark, Compass, Home, Lightbulb, LogOut, MessageSquare, Rocket, Search, Settings, ShieldCheck, Sparkles, User, Users, ClipboardList, Link2 } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMe } from "@/lib/auth";
import type { PrimaryRole } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";
import { GuidedTour, START_TOUR_EVENT } from "@/components/GuidedTour";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";

type NavItem = { to: string; label: string; icon: typeof Home; primary?: boolean };

const NAV: Record<PrimaryRole, NavItem[]> = {
  founder: [
    { to: "/dashboard", label: "Dashboard", icon: Home, primary: true },
    { to: "/problems", label: "Problems", icon: Lightbulb, primary: true },
    { to: "/my-startup", label: "My Startup", icon: Rocket, primary: true },
    { to: "/surveys", label: "Surveys", icon: ClipboardList },
    { to: "/ai-insights", label: "AI Insights", icon: Sparkles },
    { to: "/matches", label: "Investor Matches", icon: Link2 },
    { to: "/discover", label: "Discover Startups", icon: Compass },
    { to: "/connections", label: "Connections", icon: Users },
    { to: "/messages", label: "Messages", icon: MessageSquare, primary: true },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/verification", label: "Verification", icon: ShieldCheck },
    { to: "/profile", label: "Profile", icon: User, primary: true },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  investor: [
    { to: "/dashboard", label: "Dashboard", icon: Home, primary: true },
    { to: "/discover", label: "Discover Startups", icon: Compass, primary: true },
    { to: "/matches", label: "Matches", icon: Sparkles, primary: true },
    { to: "/saved", label: "Saved", icon: Bookmark },
    { to: "/connections", label: "Connections", icon: Users },
    { to: "/messages", label: "Messages", icon: MessageSquare, primary: true },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/verification", label: "Verification", icon: ShieldCheck },
    { to: "/profile", label: "Profile", icon: User, primary: true },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
  general_user: [
    { to: "/dashboard", label: "Home", icon: Home, primary: true },
    { to: "/problems", label: "Problems", icon: Lightbulb, primary: true },
    { to: "/surveys", label: "Surveys", icon: ClipboardList, primary: true },
    { to: "/discover", label: "Startups", icon: Compass },
    { to: "/contributions", label: "My Contributions", icon: Users },
    { to: "/saved", label: "Saved", icon: Bookmark },
    { to: "/notifications", label: "Notifications", icon: Bell, primary: true },
    { to: "/profile", label: "Profile", icon: User, primary: true },
    { to: "/settings", label: "Settings", icon: Settings },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { me, role, isError: meFailed, error: meError, refetch: refetchMe } = useMe();
  const { user: authUser } = useAuth();
  const metaName = authUser?.user_metadata?.["full_name"];
  const displayName = me?.profile?.full_name ?? (typeof metaName === "string" && metaName ? metaName : authUser?.email) ?? "…";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const items = NAV[role ?? "general_user"];

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-background md:flex">
      <div className="pointer-events-none fixed inset-0 ambient opacity-70" aria-hidden="true" />
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-sidebar/80 md:backdrop-blur-xl md:sticky md:z-10 md:top-0 md:h-screen">
        <Link to="/" className="flex items-center px-5 py-5"><Logo /></Link>
        <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">Workspace</p>
        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3" aria-label="Main">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="nav-item group">
              <it.icon className="h-4 w-4 transition-transform group-hover:scale-110" /> {it.label}
            </Link>
          ))}
          <div className="my-3 h-px bg-sidebar-border" />
          <Link to="/search" className="nav-item group"><Search className="h-4 w-4" /> Search</Link>
          <button onClick={() => { navigate({ to: "/dashboard" }); window.dispatchEvent(new Event(START_TOUR_EVENT)); }} className="nav-item w-full">
            <Compass className="h-4 w-4" /> Take the tour
          </button>
        </nav>
        <div className="space-y-3 border-t p-3">
          <ThemeToggle className="w-full justify-between" />
          <div className="flex items-center gap-3 rounded-lg px-1 py-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand ring-1 ring-border">{initials(displayName === "…" ? null : displayName)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs capitalize text-muted-foreground">{role?.replace("_", " ")}</p>
            </div>
            <button onClick={signOut} aria-label="Sign out" className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b glass px-4 py-3 md:hidden">
          <Link to="/"><Logo markClassName="h-7 w-7" /></Link>
          <div className="flex items-center gap-1">
            <ThemeToggle className="scale-90" />
            <button onClick={() => { navigate({ to: "/dashboard" }); window.dispatchEvent(new Event(START_TOUR_EVENT)); }} className="rounded-md p-2" aria-label="Take the tour"><Compass className="h-5 w-5" /></button>
            <Link to="/search" className="rounded-md p-2" aria-label="Search"><Search className="h-5 w-5" /></Link>
            <button onClick={signOut} className="rounded-md p-2" aria-label="Sign out"><LogOut className="h-5 w-5" /></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 page-enter relative md:px-8 md:py-10 md:pb-10"><DemoModeBanner allowReset className="mb-5" />
          {/* If the account/profile query failed, every page depending on it would sit on skeletons forever: show the reason + retry. */}
          {meFailed && !me ? <QueryErrorState title="Your workspace didn’t load" error={meError} onRetry={() => void refetchMe()} /> : children}
        </main>
        <nav className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 overflow-hidden rounded-2xl shadow-card-hover md:hidden" aria-label="Mobile">
          {items.filter((i) => i.primary).slice(0, 5).map((it) => (
            <Link key={it.to} to={it.to} className={cn("relative flex min-w-0 flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium text-muted-foreground transition-colors")} activeProps={{ className: "bg-brand-soft text-brand" }}>
              <it.icon className="h-5 w-5 shrink-0" /> <span className="max-w-full truncate">{it.label.split(" ")[0]}</span>
            </Link>
          ))}
        </nav>
      </div>
      <GuidedTour role={role} />
    </div>
  );
}
