import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, Rocket, LineChart, Users } from "lucide-react";
import { AuthSplit } from "@/components/brand/AuthSplit";
import { DemoModeBanner } from "@/components/DemoModeBanner";

const ROLE_ICON = { founder: Rocket, investor: LineChart, general_user: Users } as const;
const ROLE_BLURB = {
  founder: "Build and validate your startup.",
  investor: "Discover and connect with startups.",
  general_user: "Share problems and help validate ideas.",
} as const;
function Section({ children }: { children: string }) {
  return <p className="pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:col-span-2">{children}</p>;
}
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ensureProfile } from "@/lib/auth.functions";
import { INDUSTRIES, INVESTOR_TYPES, POLICY_VERSION, ROLE_META, STAGES, type PrimaryRole } from "@/lib/constants";
import { errorMessage } from "@/lib/utils-app";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/get-started")({
  head: () => ({
    meta: [
      { title: "Create your account — StartupBridge AI" },
      { name: "description", content: "Join StartupBridge AI as a founder, investor or general user in three quick steps." },
      { property: "og:title", content: "Create your account — StartupBridge AI" },
      { property: "og:description", content: "Join as a founder, investor or general user in three quick steps." },
    ],
  }),
  component: GetStarted,
});

type Form = {
  role: PrimaryRole | null;
  full_name: string;
  email: string;
  password: string;
  location: string;
  phone: string;
  bio: string;
  skills: string;
  industry: string;
  startup_experience: string;
  investor_type: string;
  firm_name: string;
  website: string;
  professional_profile: string;
  investment_min: string;
  investment_max: string;
  preferred_industries: string[];
  preferred_stages: string[];
  interests: string[];
};

const DRAFT_KEY = "sb-signup-draft";
type ConsentState = { terms: boolean; privacy: boolean; ai: boolean };
const EMPTY_CONSENT: ConsentState = { terms: false, privacy: false, ai: false };

function readDraft(): { step: number; form: Form; consent: ConsentState } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { step?: number; form?: Form; consent?: ConsentState };
    const step = typeof parsed.step === "number" ? Math.min(2, Math.max(0, parsed.step)) : 0;
    return {
      step,
      form: { ...EMPTY, ...(parsed.form ?? {}) },
      consent: { ...EMPTY_CONSENT, ...(parsed.consent ?? {}) },
    };
  } catch {
    return null;
  }
}

const EMPTY: Form = {
  role: null,
  full_name: "",
  email: "",
  password: "",
  location: "",
  phone: "",
  bio: "",
  skills: "",
  industry: "",
  startup_experience: "",
  investor_type: "",
  firm_name: "",
  website: "",
  professional_profile: "",
  investment_min: "",
  investment_max: "",
  preferred_industries: [],
  preferred_stages: [],
  interests: [],
};

function Chips({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}
            aria-pressed={on}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors duration-200",
              on ? "border-brand bg-brand-soft text-brand font-medium" : "hover:bg-accent",
            )}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function GetStarted() {
  const navigate = useNavigate();
  const provision = useServerFn(ensureProfile);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [consent, setConsent] = useState<ConsentState>(EMPTY_CONSENT);
  const [busy, setBusy] = useState(false);
  const [draftReady, setDraftReady] = useState(false);

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setStep(draft.step);
      setF(draft.form);
      setConsent(draft.consent);
    }
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, form: f, consent }));
    } catch {
      /* ignore quota / private-mode failures */
    }
  }, [draftReady, step, f, consent]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  function nextFromDetails() {
    if (f.full_name.trim().length < 2) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(f.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (f.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setStep(2);
  }

  async function submit() {
    if (!consent.terms || !consent.privacy || !consent.ai) {
      toast.error("Please accept all three items to continue.");
      return;
    }
    setBusy(true);
    try {
      const role = f.role!;
      const base = {
        role,
        full_name: f.full_name.trim(),
        location: f.location || null,
        phone: f.phone || null,
        bio: f.bio || null,
        consent: { terms: true, privacy: true, ai: true, version: POLICY_VERSION },
      };
      const roleMeta =
        role === "founder"
          ? {
              skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean),
              industry: f.industry || null,
              startup_experience: f.startup_experience || null,
            }
          : role === "investor"
            ? {
                investor_type: f.investor_type || null,
                firm_name: f.firm_name || null,
                website: f.website || null,
                professional_profile: f.professional_profile || null,
                preferred_industries: f.preferred_industries,
                preferred_stages: f.preferred_stages,
                investment_min: f.investment_min ? Number(f.investment_min) : 0,
                investment_max: f.investment_max ? Number(f.investment_max) : 0,
                investment_interests: f.preferred_industries,
              }
            : { interests: f.interests };
      const meta = { ...base, ...roleMeta };

      const { data, error } = await supabase.auth.signUp({
        email: f.email.trim(),
        password: f.password,
        options: { data: meta, emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      sessionStorage.removeItem(DRAFT_KEY);
      if (!data.session) {
        toast.success("Check your inbox to confirm your email, then sign in.");
        navigate({ to: "/auth" });
        return;
      }
      await provision({ data: undefined as never }).catch(() => undefined);
      toast.success(`Welcome to StartupBridge AI, ${f.full_name.split(" ")[0]}!`);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthSplit wide>
        <DemoModeBanner className="mb-4" />

        <ol className="mb-5 flex items-center gap-2 px-1" aria-label={`Step ${step + 1} of 3`}>
          {["Role", "Details", "Consent"].map((label, i) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[11px] font-semibold transition-colors duration-300", i < step ? "border-brand bg-brand text-brand-foreground" : i === step ? "border-brand text-brand" : "text-muted-foreground")}>
                {i < step ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={cn("text-xs font-medium", i <= step ? "text-foreground" : "text-muted-foreground")}>{label}</span>
              {i < 2 && (
                <span className="relative h-px flex-1 overflow-hidden bg-border">
                  <span className={cn("absolute inset-y-0 left-0 bg-brand transition-all duration-500", i < step ? "w-full" : "w-0")} />
                </span>
              )}
            </li>
          ))}
        </ol>

        <div className="glass-card p-6 sm:p-8">
          {step === 0 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h1 className="text-2xl font-bold">How will you use StartupBridge?</h1>
                <p className="mt-1 text-sm text-muted-foreground">Pick the role that fits you best. This shapes your dashboard.</p>
              </div>
              <div className="grid gap-3">
                {(["founder", "investor", "general_user"] as PrimaryRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { set("role", r); setStep(1); }}
                    aria-pressed={f.role === r}
                    className={cn("glass-interactive group relative flex items-start gap-4 rounded-xl p-4 text-left", f.role === r && "!border-brand bg-brand-soft/60")}
                  >
                    {(() => { const I = ROLE_ICON[r]; return <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand transition-transform group-hover:scale-110 duration-200"><I className="h-5 w-5" /></span>; })()}
                    <span>
                      <span className="block font-semibold">{ROLE_META[r].label}</span>
                      <span className="block text-sm text-muted-foreground">{ROLE_BLURB[r]}</span>
                    </span>
                    <span className={cn("ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors", f.role === r ? "border-brand bg-brand text-brand-foreground" : "opacity-0 group-hover:opacity-60")}><Check className="h-3 w-3" /></span>
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account? <Link to="/auth" className="font-medium text-brand hover:underline">Sign in</Link>
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h1 className="text-2xl font-bold">Tell us about you</h1>
                <p className="mt-1 text-sm text-muted-foreground">Signing up as {ROLE_META[f.role ?? "general_user"].label}.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Section>Account</Section>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={f.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="em">Email</Label>
                  <Input id="em" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw">Password</Label>
                  <Input id="pw" type="password" value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
                </div>
                <Section>About you</Section>
                <div className="space-y-1.5">
                  <Label htmlFor="loc">Location</Label>
                  <Input id="loc" value={f.location} onChange={(e) => set("location", e.target.value)} placeholder="Pune, India" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ph">Phone (private)</Label>
                  <Input id="ph" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio">Short bio</Label>
                  <Textarea id="bio" value={f.bio} onChange={(e) => set("bio", e.target.value)} rows={3} placeholder="A line or two about you" />
                </div>

                {f.role === "founder" && (
                  <>
                    <Section>Founder details</Section>
                    <div className="space-y-1.5">
                      <Label htmlFor="sk">Skills (comma separated)</Label>
                      <Input id="sk" value={f.skills} onChange={(e) => set("skills", e.target.value)} placeholder="Product, Python, Sales" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ind">Industry</Label>
                      <select id="ind" className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:border-brand/70 focus-visible:ring-4 focus-visible:ring-brand/15" value={f.industry} onChange={(e) => set("industry", e.target.value)}>
                        <option value="">Select…</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="exp">Startup experience</Label>
                      <Input id="exp" value={f.startup_experience} onChange={(e) => set("startup_experience", e.target.value)} placeholder="First-time founder / 2 previous startups" />
                    </div>
                  </>
                )}

                {f.role === "investor" && (
                  <>
                    <Section>Investment profile</Section>
                    <div className="space-y-1.5">
                      <Label htmlFor="it">Investor type</Label>
                      <select id="it" className="h-10 w-full rounded-lg border border-input bg-background/50 px-3 text-sm transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:border-brand/70 focus-visible:ring-4 focus-visible:ring-brand/15" value={f.investor_type} onChange={(e) => set("investor_type", e.target.value)}>
                        <option value="">Select…</option>
                        {INVESTOR_TYPES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="firm">Firm name</Label>
                      <Input id="firm" value={f.firm_name} onChange={(e) => set("firm_name", e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="min">Cheque size min (₹)</Label>
                      <Input id="min" inputMode="numeric" value={f.investment_min} onChange={(e) => set("investment_min", e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="max">Cheque size max (₹)</Label>
                      <Input id="max" inputMode="numeric" value={f.investment_max} onChange={(e) => set("investment_max", e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="web">Website / LinkedIn</Label>
                      <Input id="web" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://" />
                    </div>
                    <Section>Preferences</Section>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Preferred industries</Label>
                      <Chips options={INDUSTRIES} value={f.preferred_industries} onChange={(v) => set("preferred_industries", v)} />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Preferred stages</Label>
                      <Chips options={STAGES.map((s) => s.value)} value={f.preferred_stages} onChange={(v) => set("preferred_stages", v)} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="pp">Professional profile</Label>
                      <Textarea id="pp" rows={3} value={f.professional_profile} onChange={(e) => set("professional_profile", e.target.value)} placeholder="Thesis, portfolio highlights" />
                    </div>
                  </>
                )}

                {f.role === "general_user" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Interests</Label>
                    <Chips options={INDUSTRIES} value={f.interests} onChange={(v) => set("interests", v)} />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button className="flex-1" onClick={nextFromDetails}>Continue <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-up">
              <div>
                <h1 className="text-2xl font-bold">Almost there</h1>
                <p className="mt-1 text-sm text-muted-foreground">Please review and accept the following.</p>
              </div>
              <div className="space-y-3">
                {([
                  ["terms", <>I accept the <Link to="/terms" className="text-brand hover:underline" onClick={(e) => e.stopPropagation()}>Terms of Service</Link>.</>],
                  ["privacy", <>I accept the <Link to="/privacy" className="text-brand hover:underline" onClick={(e) => e.stopPropagation()}>Privacy Policy</Link>.</>],
                  ["ai", <>I understand the <Link to="/ai-disclaimer" className="text-brand hover:underline" onClick={(e) => e.stopPropagation()}>AI disclaimer</Link>: insights are suggestions, not guarantees.</>],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-start gap-3 rounded-lg border bg-background/40 p-3 text-sm transition-colors hover:border-brand/40">
                    <Checkbox
                      id={`consent-${key}`}
                      checked={consent[key]}
                      onCheckedChange={(v) => setConsent((p) => ({ ...p, [key]: v === true }))}
                      aria-label={key === "terms" ? "I accept the Terms of Service" : key === "privacy" ? "I accept the Privacy Policy" : "I understand the AI disclaimer"}
                    />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={busy}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                <Button className="flex-1" onClick={submit} disabled={busy || !consent.terms || !consent.privacy || !consent.ai}>
                  {busy ? "Creating account…" : <><Check className="mr-1 h-4 w-4" /> Create account</>}
                </Button>
              </div>
            </div>
          )}
        </div>
    </AuthSplit>
  );
}
