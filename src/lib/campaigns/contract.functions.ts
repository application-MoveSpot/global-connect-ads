import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContractVehicle = {
  vehicleId: string;
  vehicleName: string;
  vehicleType: string;
  formatPublicitaire: string | null;
  surfaceM2: number | null;
  pricePerDay: number;
  subtotal: number;
  ownerName: string;
  ownerCompany: string | null;
  proposalMessage: string | null;
  proposalDate: string;
};

export type ContractData = {
  briefId: string;
  briefTitle: string;
  description: string;
  zones: string[];
  adFormat: string | null;
  vehicleTypes: string[];
  startDate: string;
  endDate: string;
  daysCount: number;
  audienceTarget: string | null;
  totalHT: number;
  advertiser: {
    fullName: string;
    company: string | null;
    phone: string | null;
    address: string | null;
    siret: string | null;
    email: string;
  };
  vehicles: ContractVehicle[];
  generatedAt: string;
};

export const getContractData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ briefId: z.string().uuid() }))
  .handler(async ({ context, data }): Promise<ContractData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch brief scoped to the authenticated advertiser
    const { data: brief, error: briefErr } = await supabaseAdmin
      .from("advertiser_briefs")
      .select("id, advertiser_id, title, description, zones, ad_format, vehicle_types, start_date, end_date, days_count, audience_target, budget_max, status")
      .eq("id", data.briefId)
      .eq("advertiser_id", context.userId)
      .maybeSingle();

    if (briefErr || !brief) throw new Error("Brief introuvable ou accès non autorisé");

    // Accepted proposals
    const { data: proposals, error: propErr } = await supabaseAdmin
      .from("brief_proposals")
      .select("id, vehicle_id, owner_id, price_per_day, message, created_at")
      .eq("brief_id", data.briefId)
      .eq("status", "accepted");

    if (propErr) throw new Error(propErr.message);
    if (!proposals || proposals.length === 0) throw new Error("Aucune proposition acceptée sur ce brief");

    const vehicleIds = proposals.map((p) => p.vehicle_id);
    const ownerIds = proposals.map((p) => p.owner_id);

    // Vehicles + owner profiles in parallel
    const [{ data: vehicles }, { data: ownerProfiles }, { data: advertiserProfile }, { data: userAuth }] = await Promise.all([
      supabaseAdmin
        .from("vehicles")
        .select("id, name, type, format_publicitaire, surface_m2")
        .in("id", vehicleIds),
      supabaseAdmin
        .from("owner_profiles")
        .select("id, full_name, company")
        .in("id", ownerIds),
      supabaseAdmin
        .from("advertiser_profiles")
        .select("full_name, company, phone, address, siret")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin.auth.admin.getUserById(context.userId),
    ]);

    const vehicleMap = new Map((vehicles ?? []).map((v) => [v.id, v]));
    const ownerMap = new Map((ownerProfiles ?? []).map((o) => [o.id, o]));
    const daysCount = brief.days_count ?? 0;

    const contractVehicles: ContractVehicle[] = proposals.map((p) => {
      const v = vehicleMap.get(p.vehicle_id);
      const o = ownerMap.get(p.owner_id);
      const pricePerDay = Number(p.price_per_day ?? 0);
      return {
        vehicleId: p.vehicle_id,
        vehicleName: v?.name ?? "Véhicule",
        vehicleType: v?.type ?? "",
        formatPublicitaire: (v as unknown as { format_publicitaire?: string | null })?.format_publicitaire ?? null,
        surfaceM2: (v as unknown as { surface_m2?: number | null })?.surface_m2 ?? null,
        pricePerDay,
        subtotal: pricePerDay * daysCount,
        ownerName: o?.full_name ?? "Propriétaire",
        ownerCompany: o?.company ?? null,
        proposalMessage: p.message ?? null,
        proposalDate: p.created_at as string,
      };
    });

    const totalHT = contractVehicles.reduce((s, v) => s + v.subtotal, 0);

    return {
      briefId: brief.id,
      briefTitle: brief.title as string,
      description: brief.description as string,
      zones: (brief.zones as string[]) ?? [],
      adFormat: (brief.ad_format as string | null) ?? null,
      vehicleTypes: (brief.vehicle_types as string[]) ?? [],
      startDate: brief.start_date as string,
      endDate: brief.end_date as string,
      daysCount,
      audienceTarget: (brief.audience_target as string | null) ?? null,
      totalHT,
      advertiser: {
        fullName: advertiserProfile?.full_name ?? "Annonceur",
        company: advertiserProfile?.company ?? null,
        phone: advertiserProfile?.phone ?? null,
        address: advertiserProfile?.address ?? null,
        siret: advertiserProfile?.siret ?? null,
        email: userAuth?.user?.email ?? "",
      },
      vehicles: contractVehicles,
      generatedAt: new Date().toISOString(),
    };
  });
