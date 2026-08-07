import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/docs/contracts/types";

/**
 * Resuelve sesión + perfil en un solo lugar. Ningún endpoint debe asumir que
 * el perfil existe solo porque hay sesión (RNF9 de Spec.md) — `profile` puede
 * ser null con `user` no-null (autenticado, sin perfil todavía, ver F0/§4.0).
 */
export async function getSessionProfile(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null as Profile | null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile as Profile | null };
}
