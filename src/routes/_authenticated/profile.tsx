import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useInvalidateMe, useMe } from "@/lib/auth";
import { INDUSTRIES, INVESTOR_TYPES, CATEGORIES, STAGES, ROLE_META } from "@/lib/constants";
import { uploadMedia, useMediaUrl } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { errorMessage, initials } from "@/lib/utils-app";
import { QueryErrorState } from "@/components/QueryErrorState";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My profile — StartupBridge AI" },
      { name: "description", content: "Edit your public profile, photo and role-specific details on StartupBridge AI." },
      { property: "og:title", content: "My profile — StartupBridge AI" },
      { property: "og:description", content: "Edit your public profile and role details." },
    ],
  }),
  component: Profile,
});

function Chips({ all, value, onChange, label }: { all: readonly string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {all.map((x) => (
          <button key={x} type="button" aria-pressed={value.includes(x)} onClick={() => onChange(value.includes(x) ? value.filter((v) => v !== x) : [...value, x])}>
            <Badge variant={value.includes(x) ? "default" : "outline"}>{x}</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}

function Profile() {
  const { me, role, userId, isLoading, isError, error: meError, refetch: refetchMe } = useMe();
  const invalidateMe = useInvalidateMe();
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [avatar, setAvatar] = useState<string | null>(null);

  // founder
  const [skills, setSkills] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [experience, setExperience] = useState("");
  // investor
  const [investorType, setInvestorType] = useState("");
  const [firm, setFirm] = useState("");
  const [website, setWebsite] = useState("");
  const [profProfile, setProfProfile] = useState("");
  const [prefIndustries, setPrefIndustries] = useState<string[]>([]);
  const [prefStages, setPrefStages] = useState<string[]>([]);
  const [minTicket, setMinTicket] = useState("");
  const [maxTicket, setMaxTicket] = useState("");
  // general
  const [interests, setInterests] = useState<string[]>([]);

  const avatarUrl = useMediaUrl(avatar);

  useEffect(() => {
    if (!me) return;
    setFullName(me.profile?.full_name ?? "");
    setBio(me.profile?.bio ?? "");
    setLocation(me.profile?.location ?? "");
    setIsPublic(me.profile?.is_public ?? true);
    setAvatar(me.profile?.avatar_url ?? null);
    if (me.founder) {
      setSkills(me.founder.skills ?? []);
      setIndustry(me.founder.industry ?? "");
      setLinkedin(me.founder.linkedin_url ?? "");
      setExperience(me.founder.startup_experience ?? "");
    }
    if (me.investor) {
      setInvestorType(me.investor.investor_type ?? "");
      setFirm(me.investor.firm_name ?? "");
      setWebsite(me.investor.website ?? "");
      setProfProfile(me.investor.professional_profile ?? "");
      setPrefIndustries(me.investor.preferred_industries ?? []);
      setPrefStages(me.investor.preferred_stages ?? []);
      setMinTicket(me.investor.investment_min ? String(me.investor.investment_min) : "");
      setMaxTicket(me.investor.investment_max ? String(me.investor.investment_max) : "");
    }
    if (me.general) setInterests(me.general.interests ?? []);
  }, [me]);

  // A failed profile request must show its reason + retry, never endless skeletons.
  if (isError && !me) return <QueryErrorState title="Your profile didn’t load" error={meError} onRetry={() => void refetchMe()} />;
  if (isLoading || !me) return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>;

  async function pickAvatar(file: File) {
    if (!userId) return;
    try {
      const ref = await uploadMedia(userId, file, "avatars");
      setAvatar(ref);
      const { error: avatarError } = await supabase.from("profiles").update({ avatar_url: ref }).eq("id", userId);
      if (avatarError) throw new Error(avatarError.message);
      invalidateMe();
      toast.success("Photo updated.");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function save() {
    if (fullName.trim().length < 2) {
      toast.error("Please enter your name.");
      return;
    }
    setSaving(true);
    try {
      const base = { full_name: fullName.trim(), bio: bio.trim() || null, location: location.trim() || null, is_public: isPublic };
      // If the base profile row is missing (interrupted sign-up) an update would silently change nothing: create it instead.
      const { error } = me?.profile
        ? await supabase.from("profiles").update(base).eq("id", userId!)
        : await supabase.from("profiles").upsert({ id: userId!, ...base });
      if (error) throw error;

      if (role === "founder") {
        const { error: e2 } = await supabase.from("founder_profiles").upsert({
          user_id: userId!, skills, industry: industry || null, linkedin_url: linkedin.trim() || null, startup_experience: experience.trim() || null,
        });
        if (e2) throw e2;
      } else if (role === "investor") {
        const { error: e2 } = await supabase.from("investor_profiles").upsert({
          user_id: userId!,
          investor_type: investorType || null,
          firm_name: firm.trim() || null,
          website: website.trim() || null,
          professional_profile: profProfile.trim() || null,
          preferred_industries: prefIndustries,
          preferred_stages: prefStages,
          investment_min: minTicket ? Number(minTicket) : null,
          investment_max: maxTicket ? Number(maxTicket) : null,
        });
        if (e2) throw e2;
      } else if (role === "general_user") {
        const { error: e2 } = await supabase.from("general_profiles").upsert({ user_id: userId!, interests });
        if (e2) throw e2;
      }
      invalidateMe();
      toast.success("Profile saved.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">My profile</h1>
        <p className="mt-1 text-muted-foreground">
          {role ? `${ROLE_META[role].emoji} ${ROLE_META[role].label} — ${ROLE_META[role].blurb}` : "Your account details."}
        </p>
      </div>

      <div className="card-elevated space-y-4 p-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Your profile photo" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <span className="grid h-16 w-16 place-items-center rounded-full bg-brand-soft text-lg font-bold text-brand">{initials(fullName)}</span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
            <Upload className="h-4 w-4" /> Change photo
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void pickAvatar(f);
              }}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="fn">Full name</Label><Input id="fn" value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="lc">Location</Label><Input id="lc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" /></div>
        </div>
        <div className="space-y-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short introduction" /></div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Public profile</p>
            <p className="text-xs text-muted-foreground">When off, only your connections can see your profile details.</p>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} aria-label="Public profile" />
        </div>
      </div>

      {role === "founder" && (
        <div className="card-elevated space-y-4 p-5">
          <h2 className="font-semibold">Founder details</h2>
          <Chips label="Skills" all={["Product", "Engineering", "Design", "Sales", "Marketing", "Operations", "Finance", "Data"]} value={skills} onChange={setSkills} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ind">Industry</Label>
              <select id="ind" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={industry} onChange={(e) => setIndustry(e.target.value)}>
                <option value="">Select…</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="li">LinkedIn</Label><Input id="li" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/…" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="ex">Startup experience</Label><Textarea id="ex" rows={3} value={experience} onChange={(e) => setExperience(e.target.value)} /></div>
        </div>
      )}

      {role === "investor" && (
        <div className="card-elevated space-y-4 p-5">
          <h2 className="font-semibold">Investment preferences</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="it">Investor type</Label>
              <select id="it" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={investorType} onChange={(e) => setInvestorType(e.target.value)}>
                <option value="">Select…</option>
                {INVESTOR_TYPES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div className="space-y-2"><Label htmlFor="fm">Firm name</Label><Input id="fm" value={firm} onChange={(e) => setFirm(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="wb">Website</Label><Input id="wb" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
            <div className="space-y-2"><Label htmlFor="mn">Minimum ticket (₹)</Label><Input id="mn" type="number" min={0} value={minTicket} onChange={(e) => setMinTicket(e.target.value)} /></div>
            <div className="space-y-2"><Label htmlFor="mx">Maximum ticket (₹)</Label><Input id="mx" type="number" min={0} value={maxTicket} onChange={(e) => setMaxTicket(e.target.value)} /></div>
          </div>
          <Chips label="Preferred industries" all={INDUSTRIES} value={prefIndustries} onChange={setPrefIndustries} />
          <Chips label="Preferred stages" all={STAGES.map((s) => s.value)} value={prefStages} onChange={setPrefStages} />
          <div className="space-y-2"><Label htmlFor="pp">Professional profile</Label><Textarea id="pp" rows={3} value={profProfile} onChange={(e) => setProfProfile(e.target.value)} /></div>
        </div>
      )}

      {role === "general_user" && (
        <div className="card-elevated space-y-4 p-5">
          <h2 className="font-semibold">Your interests</h2>
          <p className="text-sm text-muted-foreground">We use these to show you relevant problems and surveys.</p>
          <Chips label="Interests" all={CATEGORIES} value={interests} onChange={setInterests} />
        </div>
      )}

      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
    </div>
  );
}
