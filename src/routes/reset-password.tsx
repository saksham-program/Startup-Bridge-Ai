import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthSplit } from "@/components/brand/AuthSplit";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/app-mode";
import { errorMessage } from "@/lib/utils-app";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — StartupBridge AI" }, { name: "robots", content: "noindex" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const demo = isDemoMode();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  // Supabase turns the emailed link into a temporary recovery session (detectSessionInUrl).
  useEffect(() => {
    if (demo) { setChecked(true); return; }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [demo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return void toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return void toast.error("The two passwords don't match.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      toast.success("Password updated. Please sign in with your new password.");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit>
      <div className="glass-card p-6 sm:p-9">
        <DemoModeBanner className="mb-5" />
        <h1 className="text-center text-2xl font-bold">Choose a new password</h1>
        {!ready && checked ? (
          <div className="mt-4 space-y-3 text-center text-sm text-muted-foreground">
            <p>{demo ? "Password reset is unavailable in Local Demo Mode." : "This reset link is invalid or has expired. Request a new one to continue."}</p>
            <Link to={demo ? "/auth" : "/forgot-password"} className="font-medium text-brand hover:underline">{demo ? "Back to sign in" : "Request a new link"}</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>{busy ? "Saving…" : "Update password"}</Button>
          </form>
        )}
      </div>
    </AuthSplit>
  );
}
