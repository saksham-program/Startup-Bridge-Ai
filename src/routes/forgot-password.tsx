import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { AuthSplit } from "@/components/brand/AuthSplit";
import { DemoModeBanner } from "@/components/DemoModeBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/app-mode";
import { errorMessage } from "@/lib/utils-app";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot password — StartupBridge AI" },
      { name: "description", content: "Request a password reset link for your StartupBridge AI account." },
      { property: "og:title", content: "Forgot password — StartupBridge AI" },
      { property: "og:description", content: "Request a password reset link." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const demo = isDemoMode();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (demo) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) throw error;
      // Same message whether or not the address exists, so accounts cannot be enumerated.
      setSent(true);
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
        {sent ? (
          <div className="space-y-3 text-center">
            <MailCheck className="mx-auto h-10 w-10 text-brand" aria-hidden="true" />
            <h1 className="text-2xl font-bold">Check your inbox</h1>
            <p className="text-sm text-muted-foreground">If an account exists for <strong>{email}</strong>, a reset link is on its way. The link opens a page where you can choose a new password.</p>
            <Link to="/auth" className="inline-block pt-2 text-sm font-medium text-brand hover:underline">Back to sign in</Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-2xl font-bold">Forgot your password?</h1>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {demo ? "Password reset needs a connected backend, so it is unavailable in Local Demo Mode." : "Enter your email and we'll send you a reset link."}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required disabled={demo} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
              </div>
              <Button type="submit" className="w-full" disabled={busy || demo}>{busy ? "Sending…" : "Send reset link"}</Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              <Link to="/auth" className="font-medium text-brand hover:underline">Back to sign in</Link>
            </p>
          </>
        )}
      </div>
    </AuthSplit>
  );
}
