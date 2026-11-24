import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { ensureProfile } from "./auth.functions";
import { DEMO_ACCOUNTS, type AppRole, type PrimaryRole } from "./constants";
import { resolveProfileName } from "./profile-name";
import { ensureOk } from "./supabase-helpers";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, user: session?.user ?? null, loading }), [session, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export type MeData = {
  profile: Tables<"profiles"> | null;
  roles: AppRole[];
  role: PrimaryRole | null;
  founder: Tables<"founder_profiles"> | null;
  investor: Tables<"investor_profiles"> | null;
  general: Tables<"general_profiles"> | null;
};

export function meQueryOptions(userId: string | undefined, accountName?: string) {
  return {
    queryKey: ["me", userId, accountName],
    enabled: !!userId,
    staleTime: 60_000,
    // Provisioning failures (missing server key, bad metadata) are not transient: show them quickly instead of retrying for ~7s.
    retry: 1,
    queryFn: async (): Promise<MeData> => {
      const uid = userId!;
      const [profileRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid),
      ]);
      // A failed read must surface as an error, not look like "no profile / no roles yet".
      ensureOk(profileRes, rolesRes);
      let profile = profileRes.data;
      let roles = rolesRes.data;
      const recoveredName = resolveProfileName(profile?.full_name, accountName);
      if (recoveredName && !profile) {
        const recovered = await supabase.from("profiles").insert({ id: uid, full_name: recoveredName }).select("*").maybeSingle();
        if (recovered.error) throw new Error(recovered.error.message);
        profile = recovered.data;
      } else if (profile && recoveredName && recoveredName !== profile.full_name) {
        const recovered = await supabase.from("profiles").update({ full_name: recoveredName }).eq("id", uid).select("*").maybeSingle();
        if (recovered.error) throw new Error(recovered.error.message);
        profile = recovered.data;
      }
      if (!roles?.length) {
        await ensureProfile({ data: undefined as never });
        const again = await Promise.all([
          supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", uid),
        ]);
        ensureOk(again[0], again[1]);
        profile = again[0].data;
        roles = again[1].data;
      }
      const roleList = (roles ?? []).map((r) => r.role as AppRole);
      const role = (roleList.find((r) => r !== "moderator") ?? null) as PrimaryRole | null;
      const loadRoleProfiles = () =>
        Promise.all([
          role === "founder" ? supabase.from("founder_profiles").select("*").eq("user_id", uid).maybeSingle() : null,
          role === "investor" ? supabase.from("investor_profiles").select("*").eq("user_id", uid).maybeSingle() : null,
          role === "general_user" ? supabase.from("general_profiles").select("*").eq("user_id", uid).maybeSingle() : null,
        ]);
      let [f, i, g] = await loadRoleProfiles();
      ensureOk(...[f, i, g].filter((x): x is NonNullable<typeof x> => x !== null));
      const roleProfileMissing =
        !profile || (role === "founder" && !f?.data) || (role === "investor" && !i?.data) || (role === "general_user" && !g?.data);
      if (roleProfileMissing) {
        // The account has a role but its profile / role-specific profile was never created (interrupted sign-up): complete it once.
        try {
          await ensureProfile({ data: undefined as never });
          [f, i, g] = await loadRoleProfiles();
          if (!profile) profile = (await supabase.from("profiles").select("*").eq("id", uid).maybeSingle()).data;
        } catch (e) {
          console.error("[me] could not complete account setup:", e);
        }
      }
      return {
        profile: profile ?? null,
        roles: roleList,
        role,
        founder: f?.data ?? null,
        investor: i?.data ?? null,
        general: g?.data ?? null,
      };
    },
  };
}

/** Current user's profile + role. Use inside authenticated routes. */
export function useMe() {
  const { user } = useAuth();
  const metadataName = user?.user_metadata?.["full_name"];
  const seededDemoName = Object.values(DEMO_ACCOUNTS).find((account) => account.id === user?.id)?.name;
  const accountName = typeof metadataName === "string" ? metadataName : seededDemoName;
  const q = useQuery(meQueryOptions(user?.id, accountName));
  return { ...q, me: q.data, userId: user?.id ?? null, role: q.data?.role ?? null, isModerator: q.data?.roles.includes("moderator") ?? false };
}

export function useInvalidateMe() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return () => qc.invalidateQueries({ queryKey: ["me", user?.id] });
}
