import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SiteBackdrop } from "@/components/brand/SiteBackdrop";
import { cn } from "@/lib/utils";

/**
 * Centered glass auth frame. Shares the landing page backdrop so moving from
 * "Get started" into auth feels like the same product, next step.
 */
export function AuthSplit({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <SiteBackdrop />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <Link to="/" aria-label="StartupBridge AI home"><Logo /></Link>
        <ThemeToggle />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-3 pb-12 pt-4 sm:px-6">
        <div className={cn("page-enter w-full", wide ? "max-w-[560px]" : "max-w-[460px]")}>{children}</div>
      </main>
      <footer className="relative z-10 pb-6 text-center text-xs text-muted-foreground">
        <Link to="/terms" className="hover:text-foreground">Terms & Conditions</Link>
        <span className="mx-2">·</span>
        <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <span className="mx-2">·</span>
        <Link to="/community-guidelines" className="hover:text-foreground">Community Guidelines</Link>
        <span className="mx-2">·</span>
        <Link to="/ai-disclaimer" className="hover:text-foreground">AI Disclaimer</Link>
        <span className="mx-2">·</span>© 2026 StartupBridge AI
      </footer>
    </div>
  );
}
