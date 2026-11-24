import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, LogOut, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useMe } from "@/lib/auth";
import { setBlock } from "@/lib/app.functions";
import { DISCLAIMER, POLICY_VERSION } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { errorMessage, initials } from "@/lib/utils-app";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StartupBridge AI" },
      { name: "description", content: "Notification preferences, privacy, blocked accounts, data export and sign out." },
      { property: "og:title", content: "Settings — StartupBridge AI" },
      { property: "og:description", content: "Notification preferences, privacy and data controls." },
    ],
  }),
  component: Settings,
});

type Prefs = { email: boolean; connections: boolean; messages: boolean; surveys: boolean; ai: boolean };
const DEFAULT_PREFS: Prefs = { email: true, connections: true, messages: true, surveys: true, ai: true };

function Settings() {
  const { user } = useAuth();
  const { me, userId, isLoading } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const priv = useQuery({
    queryKey: ["profile-private", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("profile_private").select("*").eq("user_id", userId!).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const blocks = useQuery({
    queryKey: ["blocks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: rows, error: rowsError } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", userId!);
      if (rowsError) throw new Error(rowsError.message);
      const ids = (rows ?? []).map((r) => r.blocked_id);
      if (!ids.length) return [];
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id,full_name").in("id", ids);
      if (profilesError) throw new Error(profilesError.message);
      return profiles ?? [];
    },
  });

  useEffect(() => {
    const p = me?.profile?.notification_prefs as Partial<Prefs> | null;
    if (p) setPrefs({ ...DEFAULT_PREFS, ...p });
  }, [me]);

  useEffect(() => {
    if (priv.data) setPhone(priv.data.phone ?? "");
  }, [priv.data]);

  if (isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;

  async function savePrefs(next: Prefs) {
    setPrefs(next);
    const { error } = await supabase.from("profiles").update({ notification_prefs: next }).eq("id", userId!);
    if (error) toast.error(errorMessage(error));
    else qc.invalidateQueries({ queryKey: ["me", userId] });
  }

  async function saveContact() {
    setSaving(true);
    try {
      const { error } = await supabase.from("profile_private").upsert({ user_id: userId!, phone: phone.trim() || null, email: user?.email ?? null });
      if (error) throw error;
      toast.success("Contact details saved. These stay private to you.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function unblock(id: string) {
    try {
      await setBlock({ data: { user_id: id, blocked: false } });
      toast.success("Account unblocked.");
      await blocks.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function exportData() {
    const uid = userId!;
    const [problems, comments, responses, conns, saved] = await Promise.all([
      supabase.from("problems").select("*").eq("author_id", uid),
      supabase.from("comments").select("*").eq("author_id", uid),
      supabase.from("survey_responses").select("*").eq("respondent_id", uid),
      supabase.from("connections").select("*").or(`requester_id.eq.${uid},recipient_id.eq.${uid}`),
      supabase.from("saved_items").select("*").eq("user_id", uid),
    ]);
    const blob = new Blob(
      [JSON.stringify({ exported_at: new Date().toISOString(), policy_version: POLICY_VERSION, profile: me?.profile, roles: me?.roles, problems: problems.data, comments: comments.data, survey_responses: responses.data, connections: conns.data, saved_items: saved.data }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "startupbridge-my-data.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Your data has been downloaded.");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const rows: { key: keyof Prefs; label: string; hint: string }[] = [
    { key: "email", label: "Email notifications", hint: "Receive a copy of important updates by email." },
    { key: "connections", label: "Connection requests", hint: "When someone wants to connect with you." },
    { key: "messages", label: "Messages", hint: "New messages from your connections." },
    { key: "surveys", label: "Surveys", hint: "New surveys matching your interests." },
    { key: "ai", label: "AI analysis", hint: "When an AI analysis finishes." },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">Signed in as {user?.email}</p>
      </div>

      <div className="card-elevated flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold">Appearance</h2>
          <p className="text-sm text-muted-foreground">Choose light, dark, or follow your device setting.</p>
        </div>
        <ThemeToggle showLabels />
      </div>

      <div className="card-elevated divide-y p-0">
        <h2 className="p-5 pb-3 font-semibold">Notifications</h2>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">{r.label}</p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
            </div>
            <Switch checked={prefs[r.key]} onCheckedChange={(v) => savePrefs({ ...prefs, [r.key]: v })} aria-label={r.label} />
          </div>
        ))}
      </div>

      <div className="card-elevated space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Private contact details</h2>
          <p className="text-xs text-muted-foreground">Never shown on your public profile. Only you can read these.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="ph">Phone</Label><Input id="ph" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" /></div>
          <div className="space-y-2"><Label htmlFor="em">Email</Label><Input id="em" value={user?.email ?? ""} disabled /></div>
        </div>
        <Button onClick={saveContact} disabled={saving}>{saving ? "Saving…" : "Save contact details"}</Button>
      </div>

      <div className="card-elevated space-y-3 p-5">
        <h2 className="font-semibold">Blocked accounts</h2>
        {blocks.isError ? (
          <p role="alert" className="text-sm text-muted-foreground">
            Blocked accounts couldn’t be loaded ({blocks.error instanceof Error ? blocks.error.message : "unknown error"}).{" "}
            <button type="button" className="font-medium text-brand hover:underline" onClick={() => void blocks.refetch()}>Try again</button>
          </p>
        ) : (blocks.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">You haven't blocked anyone.</p>
        ) : (
          <ul className="space-y-2">
            {(blocks.data ?? []).map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-xs font-bold">{initials(b.full_name)}</span>
                <span className="flex-1">{b.full_name}</span>
                <Button variant="outline" size="sm" onClick={() => unblock(b.id)}>Unblock</Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-elevated space-y-3 p-5">
        <h2 className="font-semibold">Your data</h2>
        <p className="text-sm text-muted-foreground">Download everything you've posted and shared on StartupBridge AI.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={exportData}><Download className="mr-1 h-4 w-4" /> Download my data</Button>
          <Button variant="outline" asChild><Link to="/terms">Terms & Conditions</Link></Button>
          <Button variant="outline" asChild><Link to="/privacy">Privacy Policy</Link></Button>
          <Button variant="outline" asChild><Link to="/community-guidelines">Community Guidelines</Link></Button>
          <Button variant="outline" asChild><Link to="/ai-disclaimer">AI Disclaimer</Link></Button>
        </div>
        <p className="text-xs text-muted-foreground">Policy version {POLICY_VERSION}. {DISCLAIMER}</p>
      </div>

      <div className="card-elevated space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-4 w-4 text-warning" /> Account</h2>
        <p className="text-sm text-muted-foreground">To delete your account, contact support from the email address on your account.</p>
        <Button variant="destructive" onClick={signOut}><LogOut className="mr-1 h-4 w-4" /> Sign out</Button>
      </div>
    </div>
  );
}
