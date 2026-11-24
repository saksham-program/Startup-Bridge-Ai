import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Media (avatars, logos, problem images) lives in the private `media` bucket.
 * We store `media:<path>` in the DB and resolve to a signed URL when rendering.
 */
export async function uploadMedia(userId: string, file: File, folder: string) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return `media:${path}`;
}

export async function uploadPitchDeck(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("pitch-decks").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function resolveMediaUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (!ref.startsWith("media:")) return ref;
  const path = ref.slice("media:".length);
  const { data } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

export function useMediaUrl(ref: string | null | undefined) {
  const q = useQuery({
    queryKey: ["media-url", ref],
    enabled: !!ref,
    staleTime: 1000 * 60 * 60 * 12,
    queryFn: () => resolveMediaUrl(ref),
  });
  return q.data ?? (ref && !ref.startsWith("media:") ? ref : null);
}

export async function getSignedDeckUrl(path: string) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (uid) {
    const [{ data: isGeneral }, { data: isFounder }, { data: isInvestor }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: uid, _role: "general_user" }),
      supabase.rpc("has_role", { _user_id: uid, _role: "founder" }),
      supabase.rpc("has_role", { _user_id: uid, _role: "investor" }),
    ]);
    if (isGeneral && !isFounder && !isInvestor) {
      throw new Error("Documents are restricted. General Users cannot access startup documents.");
    }
  }
  const { data, error } = await supabase.storage.from("pitch-decks").createSignedUrl(path, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}
