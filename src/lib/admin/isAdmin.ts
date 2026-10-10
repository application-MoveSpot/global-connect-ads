import { supabase } from "@/integrations/supabase/client";

/**
 * Vérifie si l'utilisateur connecté est admin.
 * Utilise la RPC check_is_admin() si disponible, sinon requête directe sur user_roles.
 */
export async function isAdmin(): Promise<boolean> {
  // Essaye la RPC (créée par migration 20261010120000)
  const { data, error } = await supabase.rpc("check_is_admin" as never);
  if (!error && typeof data === "boolean") return data;

  // Fallback : requête directe (fonctionne si la migration n'est pas encore appliquée)
  const { data: row } = await supabase
    .from("user_roles")
    .select("role")
    .eq("role", "admin")
    .maybeSingle();
  return row !== null;
}
