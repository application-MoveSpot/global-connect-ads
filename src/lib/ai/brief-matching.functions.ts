/**
 * Matching proactif briefs ↔ flottes propriétaires.
 * Appelé par le cron quotidien. Pour chaque propriétaire avec des véhicules
 * approuvés, liste les briefs publiés compatibles et envoie une push.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MatchingReport = {
  ownersNotified: number;
  matchesFound: number;
};

export const runBriefMatching = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MatchingReport> => {
    // Admin only ou cron token (vérif par service role dans supabaseAdmin)
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Récupérer les briefs publiés dans les 7 derniers jours (non encore en cours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: briefs } = await supabaseAdmin
      .from("advertiser_briefs")
      .select("id, title, vehicle_types, zones, start_date, budget_max")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (!briefs?.length) return { ownersNotified: 0, matchesFound: 0 };

    // 2. Récupérer tous les propriétaires avec au moins un véhicule approuvé
    const { data: vehicles } = await supabaseAdmin
      .from("vehicles")
      .select("id, type, zones, owner_profiles!inner(user_id, full_name)")
      .eq("status", "approved");

    if (!vehicles?.length) return { ownersNotified: 0, matchesFound: 0 };

    // Grouper par propriétaire
    type OwnerEntry = { userId: string; name: string; vehicleTypes: Set<string>; zones: Set<string> };
    const ownerMap = new Map<string, OwnerEntry>();

    for (const v of vehicles) {
      const prof = (v as unknown as Record<string, unknown>).owner_profiles as { user_id: string; full_name: string } | null;
      if (!prof) continue;
      const uid = prof.user_id;
      if (!ownerMap.has(uid)) {
        ownerMap.set(uid, { userId: uid, name: prof.full_name ?? "Propriétaire", vehicleTypes: new Set(), zones: new Set() });
      }
      const entry = ownerMap.get(uid)!;
      entry.vehicleTypes.add(String(v.type));
      for (const z of (v.zones as string[] | null) ?? []) entry.zones.add(z.toLowerCase());
    }

    const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");

    let ownersNotified = 0;
    let matchesFound = 0;

    for (const [, owner] of ownerMap) {
      // Briefs compatibles : intersection des types de véhicules.
      // Règles de pertinence :
      //   – brief sans contrainte de type → tous les propriétaires peuvent répondre ;
      //   – brief demande "autre" → les propriétaires avec "autre" dans la flotte correspondent ;
      //   – propriétaire avec "autre" uniquement → il ne voit que les briefs sans contrainte
      //     ou ceux qui incluent explicitement "autre" (pas les briefs pour types spécifiques).
      const ownerHasAutre = owner.vehicleTypes.has("autre");
      const ownerStrictTypes = new Set([...owner.vehicleTypes].filter((t) => t !== "autre"));
      const compatible = briefs.filter((b) => {
        const bTypes = (b.vehicle_types as string[] | null) ?? [];
        if (!bTypes.length) return true; // no type constraint → open to all
        if (bTypes.includes("autre") && ownerHasAutre) return true; // explicit "autre" match
        if (ownerStrictTypes.size > 0 && bTypes.some((t) => ownerStrictTypes.has(t))) return true; // direct type match
        // "autre"-only owner should NOT match briefs requiring specific types they don't have
        return false;
      });

      if (!compatible.length) continue;
      matchesFound += compatible.length;

      const topBrief = compatible[0]!;
      const body =
        compatible.length === 1
          ? `"${topBrief.title}" correspond à votre flotte — répondez avant les autres !`
          : `${compatible.length} nouveaux briefs correspondent à votre flotte. Ne les ratez pas !`;

      try {
        await sendWebPushToUser(owner.userId, {
          title: "🎯 Nouveaux briefs pour vous",
          body,
          url: "/owner/briefs",
        });
        ownersNotified++;
      } catch {
        // best-effort
      }
    }

    return { ownersNotified, matchesFound };
  });
