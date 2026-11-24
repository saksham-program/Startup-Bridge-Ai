import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { INDUSTRIES, STAGES, formatINR } from "@/lib/constants";
import { runValidationScore } from "@/lib/ai.functions";
import { uploadPitchDeck } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { errorMessage, timeAgo } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/my-startup")({
  head: () => ({
    meta: [
      { title: "My startup workspace — StartupBridge AI" },
      { name: "description", content: "Manage your startup profile, milestones, pitch deck and validation score in one workspace." },
      { property: "og:title", content: "My startup workspace — StartupBridge AI" },
      { property: "og:description", content: "Manage your startup profile, milestones and validation score." },
    ],
  }),
  component: MyStartup,
});

type Form = {
  name: string; tagline: string; problem: string; solution: string; description: string;
  industry: string; business_model: string; target_users: string; stage: string; location: string;
  website: string; funding_requirement: string; market_info: string; is_public: boolean;
};

const EMPTY: Form = {
  name: "", tagline: "", problem: "", solution: "", description: "", industry: "", business_model: "",
  target_users: "", stage: "idea", location: "", website: "", funding_requirement: "", market_info: "", is_public: true,
};

function MyStartup() {
  const { role, userId } = useMe();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [mTitle, setMTitle] = useState("");
  const [mDate, setMDate] = useState("");

  const startup = useQuery({
    queryKey: ["my-startup", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*").eq("founder_id", userId!).order("created_at").limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const id = startup.data?.id;

  const milestones = useQuery({
    queryKey: ["milestones", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("milestones").select("*").eq("startup_id", id!).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const docs = useQuery({
    queryKey: ["documents", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("startup_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const s = startup.data;
    if (!s) return;
    setForm({
      name: s.name ?? "", tagline: s.tagline ?? "", problem: s.problem ?? "", solution: s.solution ?? "",
      description: s.description ?? "", industry: s.industry ?? "", business_model: s.business_model ?? "",
      target_users: s.target_users ?? "", stage: s.stage ?? "idea", location: s.location ?? "",
      website: s.website ?? "", funding_requirement: s.funding_requirement ? String(s.funding_requirement) : "",
      market_info: s.market_info ?? "", is_public: s.is_public ?? true,
    });
  }, [startup.data]);

  if (role && role !== "founder") {
    return (
      <div className="card-elevated p-10 text-center">
        <p className="font-semibold">The startup workspace is for founders</p>
        <p className="mt-1 text-sm text-muted-foreground">Browse validated startups instead.</p>
        <Button asChild className="mt-4"><Link to="/discover">Discover startups</Link></Button>
      </div>
    );
  }

  if (startup.isLoading) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;
  if (startup.isError) return <QueryErrorState title="Your startup didn’t load" error={startup.error} onRetry={() => void startup.refetch()} />;

  async function save() {
    if (form.name.trim().length < 2) {
      toast.error("Your startup needs a name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        tagline: form.tagline.trim() || null,
        problem: form.problem.trim() || null,
        solution: form.solution.trim() || null,
        description: form.description.trim() || null,
        industry: form.industry || null,
        business_model: form.business_model.trim() || null,
        target_users: form.target_users.trim() || null,
        stage: form.stage,
        location: form.location.trim() || null,
        website: form.website.trim() || null,
        funding_requirement: form.funding_requirement ? Number(form.funding_requirement) : null,
        market_info: form.market_info.trim() || null,
        is_public: form.is_public,
      };
      const { error } = id
        ? await supabase.from("startups").update(payload).eq("id", id)
        : await supabase.from("startups").insert({ ...payload, founder_id: userId! });
      if (error) throw error;
      toast.success(id ? "Startup updated." : "Startup created.");
      await qc.invalidateQueries({ queryKey: ["my-startup", userId] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function score() {
    if (!id) return;
    setScoring(true);
    try {
      const res = await runValidationScore({ data: { id } });
      toast.success(`Validation score: ${res.result.score}/100`);
      await qc.invalidateQueries({ queryKey: ["my-startup", userId] });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setScoring(false);
    }
  }

  async function addMilestone() {
    if (!id || mTitle.trim().length < 3) {
      toast.error("Give the milestone a title.");
      return;
    }
    const { error } = await supabase.from("milestones").insert({ startup_id: id, title: mTitle.trim(), due_date: mDate || null, status: "todo" });
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    setMTitle("");
    setMDate("");
    await milestones.refetch();
  }

  async function toggleMilestone(mid: string, status: string) {
    const next = status === "done" ? "todo" : "done";
    await supabase.from("milestones").update({ status: next }).eq("id", mid);
    await milestones.refetch();
  }

  async function removeMilestone(mid: string) {
    await supabase.from("milestones").delete().eq("id", mid);
    await milestones.refetch();
  }

  async function uploadDeck(file: File) {
    if (!id || !userId) return;
    try {
      const path = await uploadPitchDeck(userId, file);
      const { error } = await supabase.from("documents").insert({ startup_id: id, owner_id: userId, name: file.name, storage_path: path, doc_type: "pitch_deck", is_private: true });
      if (error) throw error;
      toast.success("Pitch deck uploaded. Only you and verified investors you connect with can open it.");
      await docs.refetch();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">My startup</h1>
          <p className="mt-1 text-muted-foreground">Everything investors see, plus your private workspace.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {id && <Button variant="outline" asChild><Link to="/startups/$id" params={{ id }}>View public page</Link></Button>}
          {id && <Button onClick={score} disabled={scoring}><Sparkles className="mr-1 h-4 w-4" /> {scoring ? "Scoring…" : "Recompute score"}</Button>}
        </div>
      </div>

      {id && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card-elevated p-5">
            <p className="text-sm text-muted-foreground">Validation score</p>
            <p className="mt-2 text-3xl font-bold">{startup.data?.validation_score ?? "—"}<span className="text-base text-muted-foreground">/100</span></p>
          </div>
          <div className="card-elevated p-5">
            <p className="text-sm text-muted-foreground">Funding requirement</p>
            <p className="mt-2 text-3xl font-bold">{formatINR(startup.data?.funding_requirement)}</p>
          </div>
          <div className="card-elevated p-5">
            <p className="text-sm text-muted-foreground">Milestones done</p>
            <p className="mt-2 text-3xl font-bold">
              {(milestones.data ?? []).filter((m) => m.status === "done").length}/{(milestones.data ?? []).length}
            </p>
          </div>
        </div>
      )}

      <div className="card-elevated space-y-4 p-5">
        <h2 className="font-semibold">Startup profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="n">Name</Label><Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="tl">Tagline</Label><Input id="tl" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="pr">Problem you solve</Label><Textarea id="pr" rows={3} value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="so">Your solution</Label><Textarea id="so" rows={3} value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} /></div>
        <div className="space-y-2"><Label htmlFor="de">About the startup</Label><Textarea id="de" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="in">Industry</Label>
            <select id="in" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}>
              <option value="">Select…</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="st">Stage</Label>
            <select id="st" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
              {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="space-y-2"><Label htmlFor="bm">Business model</Label><Input id="bm" value={form.business_model} onChange={(e) => setForm({ ...form, business_model: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="tu">Target users</Label><Input id="tu" value={form.target_users} onChange={(e) => setForm({ ...form, target_users: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="lo">Location</Label><Input id="lo" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="we">Website</Label><Input id="we" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></div>
          <div className="space-y-2">
            <Label htmlFor="fr">Funding requirement (₹)</Label>
            <Input id="fr" type="number" min={0} value={form.funding_requirement} onChange={(e) => setForm({ ...form, funding_requirement: e.target.value })} />
          </div>
          <div className="space-y-2"><Label htmlFor="mi">Market info</Label><Input id="mi" value={form.market_info} onChange={(e) => setForm({ ...form, market_info: e.target.value })} /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Visible to investors</p>
            <p className="text-xs text-muted-foreground">Turn off to hide your startup from Discover and matching.</p>
          </div>
          <Switch checked={form.is_public} onCheckedChange={(v) => setForm({ ...form, is_public: v })} aria-label="Visible to investors" />
        </div>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : id ? "Save changes" : "Create startup"}</Button>
      </div>

      {id && (
        <>
          <div className="card-elevated space-y-4 p-5">
            <h2 className="font-semibold">Milestones</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Ship the MVP" aria-label="Milestone title" />
              <Input type="date" value={mDate} onChange={(e) => setMDate(e.target.value)} className="sm:w-44" aria-label="Due date" />
              <Button onClick={addMilestone}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </div>
            <ul className="space-y-2">
              {(milestones.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">No milestones yet.</li>}
              {(milestones.data ?? []).map((m) => (
                <li key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <input type="checkbox" checked={m.status === "done"} onChange={() => toggleMilestone(m.id, m.status)} aria-label={`Mark ${m.title} done`} />
                  <span className={`flex-1 text-sm ${m.status === "done" ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
                  {m.due_date && <Badge variant="outline">{m.due_date}</Badge>}
                  <Button variant="ghost" size="icon" onClick={() => removeMilestone(m.id)} aria-label={`Remove ${m.title}`}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="card-elevated space-y-4 p-5">
            <h2 className="font-semibold">Pitch deck & documents</h2>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="h-4 w-4" /> Upload a PDF pitch deck (kept private)
              <input
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadDeck(f);
                }}
              />
            </label>
            <ul className="space-y-2">
              {(docs.data ?? []).length === 0 && <li className="text-sm text-muted-foreground">No documents uploaded yet.</li>}
              {(docs.data ?? []).map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="text-xs text-muted-foreground">{timeAgo(d.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
