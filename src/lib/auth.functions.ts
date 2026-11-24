import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { POLICY_VERSION, type PrimaryRole } from "./constants";

const roleSchema = z.enum(["founder", "investor", "general_user"]);

const SignupMeta = z.object({
  role: roleSchema,
  full_name: z.string().min(2).max(80),
  location: z.string().max(120).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  // founder
  skills: z.array(z.string()).optional(),
  industry: z.string().optional().nullable(),
  startup_experience: z.string().optional().nullable(),
  bio: z.string().max(1000).optional().nullable(),
  // investor
  investor_type: z.string().optional().nullable(),
  investment_interests: z.array(z.string()).optional(),
  preferred_industries: z.array(z.string()).optional(),
  preferred_stages: z.array(z.string()).optional(),
  investment_min: z.number().optional().nullable(),
  investment_max: z.number().optional().nullable(),
  firm_name: z.string().optional().nullable(),
  professional_profile: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  // general
  interests: z.array(z.string()).optional(),
  // consent
  consent: z
    .object({ terms: z.literal(true), privacy: z.literal(true), ai: z.literal(true), version: z.string() })
    .optional(),
});

/**
 * Called on first authenticated session. Provisions profile + role + role-profile + consent
 * from the signup metadata. Idempotent: never changes an existing role (prevents escalation).
 */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, supabase, claims } = context;
    const { data: existingRoles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const hasRole = !!existingRoles && existingRoles.length > 0;
    if (hasRole) {
      const primary = (existingRoles.find((r) => r.role !== "moderator")?.role ?? existingRoles[0]!.role) as PrimaryRole;
      // Fully provisioned already? (the role-specific profile row exists) → nothing to do.
      const table = primary === "founder" ? "founder_profiles" : primary === "investor" ? "investor_profiles" : "general_profiles";
      const [{ data: roleProfile }, { data: baseProfile }] = await Promise.all([
        supabase.from(table).select("user_id").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("id").eq("id", userId).maybeSingle(),
      ]);
      if (roleProfile && baseProfile) return { created: false, role: primary };
      // Otherwise an earlier sign-up was interrupted part-way: fall through and complete the missing rows.
    }

    // Needs SUPABASE_SERVICE_ROLE_KEY on the server; throws a clear ConfigError naming the variable if it is missing.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const claimMeta = (claims as { user_metadata?: unknown }).user_metadata;
    let parsed = SignupMeta.safeParse(claimMeta ?? {});
    if (!parsed.success) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      parsed = SignupMeta.safeParse(authUser?.user?.user_metadata ?? {});
    }
    if (!parsed.success) {
      throw new Error("Your account is missing signup details (role / name). Please sign up again with a new account.");
    }
    const meta = parsed.data;
    const role: PrimaryRole = hasRole ? ((existingRoles.find((r) => r.role !== "moderator")?.role ?? meta.role) as PrimaryRole) : meta.role;

    // Critical rows: any failure is reported (previously these errors were silently ignored).
    const must = (res: { error: { message: string } | null }, what: string) => {
      if (res.error) throw new Error(`Could not set up your account (${what}): ${res.error.message}`);
    };
    // Non-critical rows: log and continue so they can never block a sign-in.
    const optional = (res: { error: { message: string } | null }, what: string) => {
      if (res.error) console.error(`[ensureProfile] ${what} failed:`, res.error.message);
    };

    must(
      await supabaseAdmin.from("profiles").upsert(
        { id: userId, full_name: meta.full_name, location: meta.location ?? null, bio: meta.bio ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      ),
      "profile",
    );
    const email = (claims as { email?: string }).email ?? null;
    must(await supabaseAdmin.from("profile_private").upsert({ user_id: userId, phone: meta.phone ?? null, email }, { onConflict: "user_id" }), "private details");
    if (!hasRole) must(await supabaseAdmin.from("user_roles").insert({ user_id: userId, role }), "role");

    const ensureVerification = async (organization: string | null) => {
      const { data: existing } = await supabaseAdmin.from("verification_records").select("id").eq("user_id", userId).limit(1).maybeSingle();
      if (!existing) must(await supabaseAdmin.from("verification_records").insert({ user_id: userId, status: "pending", organization }), "verification record");
    };

    if (role === "founder") {
      must(
        await supabaseAdmin.from("founder_profiles").upsert({
          user_id: userId,
          skills: meta.skills ?? [],
          industry: meta.industry ?? null,
          industry_interests: meta.industry ? [meta.industry] : [],
          startup_experience: meta.startup_experience ?? null,
          verification_status: "pending",
        }),
        "founder profile",
      );
      await ensureVerification(meta.industry ?? null);
    } else if (role === "investor") {
      must(
        await supabaseAdmin.from("investor_profiles").upsert({
          user_id: userId,
          investor_type: meta.investor_type ?? null,
          investment_interests: meta.investment_interests ?? [],
          preferred_industries: meta.preferred_industries ?? [],
          preferred_stages: meta.preferred_stages ?? [],
          investment_min: meta.investment_min ?? 0,
          investment_max: meta.investment_max ?? 0,
          firm_name: meta.firm_name ?? null,
          professional_profile: meta.professional_profile ?? null,
          website: meta.website ?? null,
          verification_status: "pending",
        }),
        "investor profile",
      );
      await ensureVerification(meta.firm_name ?? null);
    } else {
      must(await supabaseAdmin.from("general_profiles").upsert({ user_id: userId, interests: meta.interests ?? [] }), "general profile");
    }

    if (!hasRole) {
      optional(
        await supabaseAdmin.from("consents").insert({
          user_id: userId,
          policy_version: meta.consent?.version ?? POLICY_VERSION,
          terms_accepted: true,
          privacy_accepted: true,
          ai_disclaimer_accepted: true,
        }),
        "consent record",
      );
      optional(await supabaseAdmin.from("audit_logs").insert({ user_id: userId, action: "account.provisioned", metadata: { role } }), "audit log");
      optional(
        await supabaseAdmin.from("notifications").insert({
          user_id: userId,
          type: "welcome",
          title: "Welcome to StartupBridge AI",
          body: "Complete your profile to get better recommendations.",
          link: "/profile",
        }),
        "welcome notification",
      );
    }

    return { created: !hasRole, role };
  });
