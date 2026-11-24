import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { createProblem } from "@/lib/app.functions";
import { runProblemAnalysis } from "@/lib/ai.functions";
import { uploadMedia } from "@/lib/media";
import { useMe } from "@/lib/auth";
import { CATEGORIES, FREQUENCIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/utils-app";

export const Route = createFileRoute("/_authenticated/problems/new")({
  head: () => ({
    meta: [
      { title: "Post a problem — StartupBridge AI" },
      { name: "description", content: "Describe a real-world problem so founders can validate and build solutions for it." },
      { property: "og:title", content: "Post a problem — StartupBridge AI" },
      { property: "og:description", content: "Describe a real problem worth solving." },
    ],
  }),
  component: NewProblem,
});

function NewProblem() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useMe();
  const create = useServerFn(createProblem);
  const analyze = useServerFn(runProblemAnalysis);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    who_faces: "",
    frequency: "",
    tags: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.title.trim().length < 8) {
      toast.error("Title should be at least 8 characters.");
      return;
    }
    if (form.description.trim().length < 30) {
      toast.error("Please describe the problem in at least 30 characters.");
      return;
    }
    if (!form.category) {
      toast.error("Please pick a category.");
      return;
    }
    setBusy(true);
    try {
      let image_url: string | null = null;
      if (file && userId) image_url = await uploadMedia(userId, file, "problems");
      const { id } = await create({
        data: {
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category as (typeof CATEGORIES)[number],
          location: form.location || null,
          who_faces: form.who_faces || null,
          frequency: (form.frequency || null) as (typeof FREQUENCIES)[number] | null,
          image_url,
          tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
        },
      });
      toast.success("Problem posted. Running AI analysis…");
      qc.invalidateQueries({ queryKey: ["problems"] });
      analyze({ data: { id } })
        .then(() => qc.invalidateQueries({ queryKey: ["problem-analysis", id] }))
        .catch(() => undefined);
      navigate({ to: "/problems/$id", params: { id } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <Link to="/problems" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Problem Hub
      </Link>
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Post a problem</h1>
        <p className="mt-1 text-muted-foreground">Be specific. Clear problems attract better solutions and validation.</p>
      </div>
      <form onSubmit={submit} className="card-elevated space-y-4 p-6">
        <div className="space-y-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Farmers can't get fair prices for surplus produce" maxLength={140} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">Description</Label>
          <Textarea id="desc" rows={6} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What happens today, why it hurts, what people try instead…" maxLength={4000} />
          <p className="text-xs text-muted-foreground">{form.description.length}/4000</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat">Category</Label>
            <select id="cat" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="">Select…</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="freq">How often does it happen?</Label>
            <select id="freq" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.frequency} onChange={(e) => set("frequency", e.target.value)}>
              <option value="">Select…</option>
              {FREQUENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Nashik, India" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="who">Who faces it?</Label>
            <Input id="who" value={form.who_faces} onChange={(e) => set("who_faces", e.target.value)} placeholder="Small farmers, students, nurses…" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tags">Tags (comma separated, max 8)</Label>
            <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="agriculture, pricing, supply-chain" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="img">Photo (optional)</Label>
            <Input id="img" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "Posting…" : "Post problem"}</Button>
        <p className="text-xs text-muted-foreground">Posts are checked automatically for spam and are rate-limited to 5 per hour.</p>
      </form>
    </div>
  );
}
