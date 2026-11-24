import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { AuthSplit } from "@/components/brand/AuthSplit";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { isDemoMode } from "@/lib/app-mode";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — StartupBridge AI" },
      { name: "description", content: "Sign in to your StartupBridge AI account." },
      { property: "og:title", content: "Sign in — StartupBridge AI" },
      { property: "og:description", content: "Sign in to your StartupBridge AI account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  // True when no Supabase backend is configured: sign-in is unavailable and the page says so.
  const noBackend = isDemoMode();

  function safeTarget() {
    return redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    if (noBackend) return;
    setBusy("login");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] });
    navigate({ to: safeTarget() });
  }

  return (
    <AuthSplit>
        <div className="glass-card p-6 sm:p-9">
          <DemoModeBanner className="mb-5" />
          <h1 className="text-center text-2xl font-bold">Welcome back</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">Sign in to continue.</p>
          <form onSubmit={login} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required disabled={noBackend} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-xs text-brand hover:underline">Forgot password?</Link>
              </div>
              <Input id="password" type="password" required disabled={noBackend} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={!!busy || noBackend}>{busy === "login" ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account? <Link to="/get-started" className="font-medium text-brand hover:underline">Get started</Link>
          </p>
        </div>
    </AuthSplit>
  );
}
