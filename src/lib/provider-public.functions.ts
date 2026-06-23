import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const getProviderPublicMeta = createServerFn({ method: "GET" })
  .inputValidator((data: { providerId: string }) => data)
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row } = await supabase
      .from("provider_profiles")
      .select("user_id, company, full_name, description, services, coverage_areas")
      .eq("user_id", data.providerId)
      .eq("status", "approved")
      .maybeSingle();
    if (!row) return null;
    const name = row.company || row.full_name || "Prestataire";
    const rawDesc = (row.description || "").replace(/\s+/g, " ").trim();
    const desc = rawDesc
      ? rawDesc.slice(0, 155)
      : `Prestataire MoveSpot — ${name}. Habillage véhicules, covering, supports publicitaires.`;
    return { name, description: desc };
  });
