import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * `vehicles.owner_id` référence `owner_profiles.id`, jamais `auth.users.id`.
 *
 * Toute requête qui filtre `vehicles` (ou `drivers`, qui suit la même règle) par
 * le propriétaire doit donc d'abord résoudre l'identifiant du profil à partir de
 * l'identifiant d'authentification. Filtrer directement avec `auth.uid()` ne
 * renvoie aucune ligne.
 *
 * Renvoie `null` quand l'utilisateur n'a pas de profil propriétaire : l'appelant
 * décide alors du comportement (liste vide, accès refusé, etc.).
 */
export async function getOwnerProfileId(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data, error } = await client
    .from("owner_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
