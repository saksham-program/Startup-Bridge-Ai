import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/auth";
import { simulateVerificationReview, submitVerification } from "@/lib/app.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { INVESTOR_TYPES } from "@/lib/constants";
import { errorMessage, timeAgo } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/verification")({
  head: () => ({
    meta: [
      { title: "Verification — StartupBridge AI" },
      { name: "description", content: "Request verified founder or investor status to build trusted funding and business relationships." },
      { property: "og:title", content: "Verification — StartupBridge AI" },
      { property: "og:description", content: "Request verified founder or investor status." },
    ],
  }),
  component: Verification,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Not submitted",
  under_review: "Under review",
  verified: "Verified",
  rejected: "Not approved",
};

const INVESTOR_VERIFY_TYPES = [
  ...INVESTOR_TYPES,
  "Angel Investor",
  "Corporate Investor",
  "Investment Firm",
  "Other",
] as const;

const INVESTOR_ROLES = [
  "Founder",
  "Partner",
  "Investment Manager",
  "Analyst",
  "Director",
  "Other",
] as const;

type FormState = {
  legal_name: string;
  date_of_birth: string;
  organization: string;
  legal_company_name: string;
  company_registration: string;
  startup_id: string;
  ownership_attestation: boolean;
  professional_reference: string;
  notes: string;
  investor_type: string;
  professional_role: string;
};

const EMPTY: FormState = {
  legal_name: "",
  date_of_birth: "",
  organization: "",
  legal_company_name: "",
  company_registration: "",
  startup_id: "",
  ownership_attestation: false,
  professional_reference: "",
  notes: "",
  investor_type: "",
  professional_role: "",
};

function Verification() {
  const { userId, role, me } = useMe();
  const qc = useQueryClient();
  const submit = useServerFn(submitVerification);
  const review = useServerFn(simulateVerificationReview);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const isFounder = role === "founder";
  const isInvestor = role === "investor";
  const canVerify = isFounder || isInvestor;

  const record = useQuery({
    queryKey: ["verification", userId],
    enabled: !!userId && canVerify,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verification_records")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });

  const startups = useQuery({
    queryKey: ["my-startups-min", userId],
    enabled: !!userId && isFounder,
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("id,name").eq("founder_id", userId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!canVerify || !me) return;
    const row = record.data;
    const owned = startups.data ?? [];
    const selected = owned.find((s) => s.id === row?.startup_id) ?? owned[0];
    const orgPrefill = isFounder ? (selected?.name ?? "") : (me.investor?.firm_name ?? "");
    const refPrefill = isFounder ? (me.founder?.linkedin_url ?? "") : (me.investor?.professional_profile || me.investor?.website || "");
    const typePrefill = row?.investor_type || me.investor?.investor_type || "";
    setForm({
      legal_name: row?.legal_name || me.profile?.full_name || "",
      date_of_birth: row?.date_of_birth ?? "",
      organization: row?.organization || orgPrefill,
      legal_company_name: row?.legal_company_name || orgPrefill,
      company_registration: row?.company_registration ?? "",
      startup_id: isFounder ? (row?.startup_id || selected?.id || "") : "",
      ownership_attestation: isFounder ? (row?.ownership_attestation ?? false) : false,
      professional_reference: row?.professional_reference || refPrefill,
      notes: row?.notes && !row.notes.startsWith("Demo review") ? row.notes : "",
      investor_type: isInvestor ? typePrefill : "",
      professional_role: isInvestor ? (row?.professional_role || "") : "",
    });
  }, [canVerify, isFounder, isInvestor, me, record.data, startups.data]);

  const status = record.data?.status ?? "pending";

  function patch(next: Partial<FormState>) {
    setForm((p) => ({ ...p, ...next }));
  }

  function onStartupChange(id: string) {
    const selected = (startups.data ?? []).find((s) => s.id === id);
    patch({
      startup_id: id,
      organization: selected?.name || form.organization,
      legal_company_name: selected?.name || form.legal_company_name,
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (form.legal_name.trim().length < 2) {
      toast.error("Please enter your legal full name.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date_of_birth)) {
      toast.error("Please enter your date of birth.");
      return;
    }
    if (form.legal_company_name.trim().length < 2 || form.organization.trim().length < 2) {
      toast.error(isFounder ? "Please enter your legal company/startup name." : "Please enter your firm / company / organization name.");
      return;
    }
    if (isInvestor && form.investor_type.trim().length < 2) {
      toast.error("Please select your investor type.");
      return;
    }
    if (isInvestor && form.professional_role.trim().length < 2) {
      toast.error("Please enter your professional role.");
      return;
    }
    if (form.professional_reference.trim().length < 2) {
      toast.error("Please fill in a professional reference.");
      return;
    }
    if (isFounder && !form.ownership_attestation) {
      toast.error("Please confirm you own or are authorized to represent this startup.");
      return;
    }
    setBusy(true);
    try {
      await submit({
        data: {
          organization: form.organization.trim() || form.legal_company_name.trim(),
          professional_reference: form.professional_reference.trim(),
          notes: form.notes || undefined,
          legal_name: form.legal_name.trim(),
          date_of_birth: form.date_of_birth,
          legal_company_name: form.legal_company_name.trim(),
          company_registration: form.company_registration.trim() || undefined,
          ownership_attestation: isFounder ? form.ownership_attestation : undefined,
          startup_id: isFounder && form.startup_id ? form.startup_id : undefined,
          investor_type: isInvestor ? form.investor_type.trim() : undefined,
          professional_role: isInvestor ? form.professional_role.trim() : undefined,
        },
      });
      toast.success("Submitted. Your request is now under review.");
      qc.invalidateQueries({ queryKey: ["verification", userId] });
      qc.invalidateQueries({ queryKey: ["me", userId] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function simulate(outcome: "verified" | "rejected") {
    setBusy(true);
    try {
      await review({ data: { outcome } });
      toast.success(outcome === "verified" ? (isFounder ? "You're now a Verified Founder." : "You're now a Verified Investor.") : "Request marked not approved.");
      qc.invalidateQueries({ queryKey: ["verification", userId] });
      qc.invalidateQueries({ queryKey: ["me", userId] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (canVerify && (record.isError || startups.isError)) {
    const failed = record.isError ? record : startups;
    return <QueryErrorState title="Verification details didn’t load" error={failed.error} onRetry={() => { void record.refetch(); void startups.refetch(); }} />;
  }

  if (!canVerify) {
    return (
      <div className="card-elevated p-10 text-center">
        <ShieldCheck className="mx-auto h-6 w-6 text-muted-foreground" />
        <p className="mt-2 font-semibold">Verification is for founder and investor accounts</p>
        <p className="mt-1 text-sm text-muted-foreground">Your current account type doesn't need it.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{isFounder ? "Founder verification" : "Investor verification"}</h1>
        <p className="mt-1 text-muted-foreground">{isFounder ? "Verified founders can build trusted relationships with investors and participate in funding and business interactions." : "Verified investors can view private pitch decks and get priority in founder matches."}</p>
      </div>

      <div className="card-elevated flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="text-sm text-muted-foreground">Current status</p>
          <Badge className="mt-1" variant={status === "verified" ? "default" : "secondary"}>{STATUS_LABEL[status]}</Badge>
          {record.data?.submitted_at && <p className="mt-2 text-xs text-muted-foreground">Submitted {timeAgo(record.data.submitted_at)}</p>}
          {isInvestor && (
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="text-muted-foreground">Investor Type:</span> {form.investor_type || record.data?.investor_type || me?.investor?.investor_type || "—"}</p>
              <p><span className="text-muted-foreground">Professional Role / Designation:</span> {form.professional_role || record.data?.professional_role || "—"}</p>
            </div>
          )}
        </div>
        {status === "under_review" && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => simulate("verified")} disabled={busy}>Simulate approval</Button>
            <Button size="sm" variant="outline" onClick={() => simulate("rejected")} disabled={busy}>Simulate rejection</Button>
          </div>
        )}
      </div>

      {status !== "verified" && (
        <form onSubmit={send} className="card-elevated space-y-4 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="legal_name">Legal full name</Label>
            <Input id="legal_name" value={form.legal_name} onChange={(e) => patch({ legal_name: e.target.value })} autoComplete="name" />
            {me?.profile?.full_name && form.legal_name === me.profile.full_name && (
              <p className="text-xs text-muted-foreground">Prefilled from your profile. Change it if your legal name is different.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => patch({ date_of_birth: e.target.value })} />
          </div>
          {isFounder && (
            <div className="space-y-1.5">
              <Label htmlFor="startup">Startup association</Label>
              {(startups.data ?? []).length > 0 ? (
                <select id="startup" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.startup_id} onChange={(e) => onStartupChange(e.target.value)}>
                  {(startups.data ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-muted-foreground">No startup on your account yet. You can still submit with your company name.</p>
              )}
            </div>
          )}
          {isInvestor && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="investor_type">Investor Type</Label>
                <select id="investor_type" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.investor_type} onChange={(e) => patch({ investor_type: e.target.value })}>
                  <option value="">Select…</option>
                  {Array.from(new Set(INVESTOR_VERIFY_TYPES)).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  {form.investor_type && !INVESTOR_VERIFY_TYPES.includes(form.investor_type as (typeof INVESTOR_VERIFY_TYPES)[number]) && (
                    <option value={form.investor_type}>{form.investor_type}</option>
                  )}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="professional_role">Professional Role / Designation</Label>
                <Input id="professional_role" list="professional-role-options" value={form.professional_role} onChange={(e) => patch({ professional_role: e.target.value })} placeholder="Partner, Investment Manager, Analyst…" />
                <datalist id="professional-role-options">
                  {INVESTOR_ROLES.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="legal_company">{isFounder ? "Legal company / startup name" : "Firm / company / organization name"}</Label>
            <Input id="legal_company" value={form.legal_company_name} onChange={(e) => patch({ legal_company_name: e.target.value, organization: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reg">{isFounder ? "Company registration number / details" : "Company / firm registration details"}</Label>
            <Input id="reg" value={form.company_registration} onChange={(e) => patch({ company_registration: e.target.value })} placeholder="Optional — CIN, LLC number, or equivalent" />
          </div>
          {isFounder && (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
              <Checkbox checked={form.ownership_attestation} onCheckedChange={(v) => patch({ ownership_attestation: v === true })} aria-label="Startup ownership" />
              <span>I own this startup or am authorized to represent it for verification.</span>
            </label>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="ref">Professional reference</Label>
            <Input id="ref" value={form.professional_reference} onChange={(e) => patch({ professional_reference: e.target.value })} placeholder="LinkedIn URL, firm website or a referee" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} placeholder="Anything that helps us confirm your profile" />
          </div>
          <Button type="submit" disabled={busy} className="w-full">{busy ? "Submitting…" : status === "under_review" ? "Update request" : "Request verification"}</Button>
          <p className="text-xs text-muted-foreground">This is a demonstration workflow — no identity documents are collected or stored.</p>
        </form>
      )}
    </div>
  );
}
