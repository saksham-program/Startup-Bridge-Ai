import { AlertTriangle } from "lucide-react";
import { isDemoMode } from "@/lib/app-mode";
import { cn } from "@/lib/utils";

/**
 * Shown only when no Supabase backend is configured (Supabase variables missing in .env).
 * Explains why sign-in / sign-up are unavailable; renders nothing when the backend is configured.
 */
export function DemoModeBanner({ className }: { className?: string; compact?: boolean; allowReset?: boolean }) {
  if (!isDemoMode()) return null;
  return (
    <div role="alert" className={cn("flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-foreground", className)}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
      <span>
        <strong className="font-semibold">Backend not configured.</strong> Sign-in and account creation need a Supabase project: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in <code>.env</code> and restart (see README).
      </span>
    </div>
  );
}
