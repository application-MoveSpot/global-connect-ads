import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ── Types ────────────────────────────────────────────────────────────────────

export type AuditExportResult = {
  generatedAt: string;
  periodFrom: string;
  periodTo: string;
  summary: {
    totalCampaigns: number;
    totalRevenueCents: number;
    totalCommissionsCents: number;
    totalTransfersCents: number;
    uniqueAdvertisers: number;
    uniqueOwners: number;
  };
  campaigns: AuditCampaignRow[];
  walletTransactions: AuditWalletRow[];
  bankTransfers: AuditTransferRow[];
  commissions: AuditCommissionRow[];
};

export type AuditCampaignRow = {
  id: string;
  createdAt: string;
  status: string;
  advertiserName: string;
  advertiserCompany: string | null;
  advertiserSiret: string | null;
  vehicleOwnerName: string | null;
  vehicleName: string | null;
  spotName: string | null;
  startDate: string | null;
  endDate: string | null;
  totalPriceCents: number | null;
  paymentStatus: string;
  gpsPointsCount: number;
};

export type AuditWalletRow = {
  id: string;
  createdAt: string;
  type: string;
  amountCents: number;
  description: string | null;
  userName: string | null;
  userSiret: string | null;
  campaignId: string | null;
};

export type AuditTransferRow = {
  id: string;
  createdAt: string;
  reference: string;
  amountCents: number;
  status: string;
  userName: string | null;
  campaignId: string | null;
};

export type AuditCommissionRow = {
  id: string;
  createdAt: string;
  campaignId: string;
  ownerAmountCents: number;
  moveSpotAmountCents: number;
  driverAmountCents: number;
  providerAmountCents: number;
};

// ── Export audit complet ─────────────────────────────────────────────────────

export const adminExportAuditData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Vérifier que l'appelant est admin
    const { data: adminRow } = await supabase.from("admin_profiles").select("id").maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { dateFrom, dateTo } = data;
    const dateToInclusive = dateTo + "T23:59:59Z";

    // ── Campagnes ──
    const { data: campaigns } = await supabaseAdmin
      .from("campaign_requests")
      .select(
        `
        id, created_at, status, payment_status, spot_name, start_date, end_date, total_price,
        advertiser_id, vehicle_id,
        advertiser_profiles!campaign_requests_advertiser_id_fkey(full_name, company, siret),
        vehicles(name, owner_id, owner_profiles!vehicles_owner_id_fkey(full_name))
      `,
      )
      .gte("created_at", dateFrom)
      .lte("created_at", dateToInclusive)
      .order("created_at");

    // Compte GPS par campagne
    const campaignIds = (campaigns ?? []).map((c: any) => c.id);
    const gpsCounts: Record<string, number> = {};
    if (campaignIds.length > 0) {
      const { data: gpsBuckets } = await supabaseAdmin
        .from("campaign_metrics")
        .select("campaign_request_id, total_gps_points")
        .in("campaign_request_id", campaignIds);
      for (const b of gpsBuckets ?? []) {
        gpsCounts[(b as any).campaign_request_id] = (b as any).total_gps_points ?? 0;
      }
    }

    const campaignRows: AuditCampaignRow[] = (campaigns ?? []).map((c: any) => ({
      id: c.id,
      createdAt: c.created_at,
      status: c.status,
      advertiserName: c.advertiser_profiles?.full_name ?? "—",
      advertiserCompany: c.advertiser_profiles?.company ?? null,
      advertiserSiret: c.advertiser_profiles?.siret ?? null,
      vehicleOwnerName: c.vehicles?.owner_profiles?.full_name ?? null,
      vehicleName: c.vehicles?.name ?? null,
      spotName: c.spot_name,
      startDate: c.start_date,
      endDate: c.end_date,
      totalPriceCents: c.total_price ? Math.round(c.total_price * 100) : null,
      paymentStatus: c.payment_status,
      gpsPointsCount: gpsCounts[c.id] ?? 0,
    }));

    // ── Transactions wallet ──
    const { data: walletTxs } = await supabaseAdmin
      .from("wallet_transactions")
      .select("id, created_at, kind, amount_cents, description, campaign_request_id, user_id")
      .gte("created_at", dateFrom)
      .lte("created_at", dateToInclusive)
      .order("created_at");

    // Résolution des noms utilisateurs (batch)
    const userIds = [...new Set((walletTxs ?? []).map((t: any) => t.user_id).filter(Boolean))];
    const userNames: Record<string, { name: string; siret: string | null }> = {};
    if (userIds.length > 0) {
      const { data: advProfiles } = await supabaseAdmin
        .from("advertiser_profiles")
        .select("user_id, full_name, siret")
        .in("user_id", userIds);
      for (const p of advProfiles ?? []) {
        userNames[(p as any).user_id] = { name: (p as any).full_name, siret: (p as any).siret };
      }
    }

    const walletRows: AuditWalletRow[] = (walletTxs ?? []).map((t: any) => ({
      id: t.id,
      createdAt: t.created_at,
      type: t.kind,
      amountCents: t.amount_cents ?? 0,
      description: t.description,
      userName: userNames[t.user_id]?.name ?? null,
      userSiret: userNames[t.user_id]?.siret ?? null,
      campaignId: t.campaign_request_id,
    }));

    // ── Virements bancaires ──
    const { data: transfers } = await supabaseAdmin
      .from("bank_transfer_requests")
      .select("id, created_at, reference, amount_cents, status, user_id, campaign_request_id")
      .gte("created_at", dateFrom)
      .lte("created_at", dateToInclusive)
      .order("created_at");

    const transferRows: AuditTransferRow[] = (transfers ?? []).map((t: any) => ({
      id: t.id,
      createdAt: t.created_at,
      reference: t.reference,
      amountCents: t.amount_cents,
      status: t.status,
      userName: userNames[t.user_id]?.name ?? null,
      campaignId: t.campaign_request_id,
    }));

    // ── Commissions ──
    const { data: commissions } = await supabaseAdmin
      .from("campaign_metrics")
      .select(
        "id, created_at, campaign_request_id, owner_payout_cents, platform_commission_cents, driver_bonus_cents, provider_payout_cents",
      )
      .gte("created_at", dateFrom)
      .lte("created_at", dateToInclusive)
      .order("created_at");

    const commissionRows: AuditCommissionRow[] = (commissions ?? []).map((c: any) => ({
      id: c.id,
      createdAt: c.created_at,
      campaignId: c.campaign_request_id,
      ownerAmountCents: c.owner_payout_cents ?? 0,
      moveSpotAmountCents: c.platform_commission_cents ?? 0,
      driverAmountCents: c.driver_bonus_cents ?? 0,
      providerAmountCents: c.provider_payout_cents ?? 0,
    }));

    // ── Résumé ──
    const totalRevenue = campaignRows.reduce((s, c) => s + (c.totalPriceCents ?? 0), 0);
    const totalCommissions = commissionRows.reduce((s, c) => s + c.moveSpotAmountCents, 0);
    const totalTransfers = transferRows
      .filter((t) => t.status === "confirmed")
      .reduce((s, t) => s + t.amountCents, 0);

    const result: AuditExportResult = {
      generatedAt: new Date().toISOString(),
      periodFrom: dateFrom,
      periodTo: dateTo,
      summary: {
        totalCampaigns: campaignRows.length,
        totalRevenueCents: totalRevenue,
        totalCommissionsCents: totalCommissions,
        totalTransfersCents: totalTransfers,
        uniqueAdvertisers: new Set(campaigns?.map((c: any) => c.advertiser_id)).size,
        uniqueOwners: new Set(campaigns?.map((c: any) => c.vehicles?.owner_id).filter(Boolean))
          .size,
      },
      campaigns: campaignRows,
      walletTransactions: walletRows,
      bankTransfers: transferRows,
      commissions: commissionRows,
    };

    return result;
  });

// ── Détection de fraude GPS ──────────────────────────────────────────────────

export type GpsFraudFlag = {
  vehicleId: string;
  vehicleName: string;
  flagType: "speed_anomaly" | "static_spoofing" | "zone_violation" | "no_movement";
  severity: "high" | "medium" | "low";
  description: string;
  detectedAt: string;
  samplePoints?: { lat: number; lng: number; recordedAt: string }[];
};

export const adminDetectGpsFraud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: adminRow } = await supabase.from("admin_profiles").select("id").maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const flags: GpsFraudFlag[] = [];

    // Récupère les positions GPS de la période groupées par véhicule
    const { data: positions } = await supabaseAdmin
      .from("vehicle_positions")
      .select("vehicle_id, lat, lng, recorded_at, speed, accuracy, vehicles(name)")
      .gte("recorded_at", data.dateFrom)
      .lte("recorded_at", data.dateTo + "T23:59:59Z")
      .order("vehicle_id")
      .order("recorded_at")
      .limit(50000); // cap pour éviter timeout

    if (!positions?.length) return { flags: [], analyzedPoints: 0 };

    // Groupe par véhicule
    const byVehicle: Record<string, typeof positions> = {};
    for (const p of positions) {
      if (!byVehicle[p.vehicle_id]) byVehicle[p.vehicle_id] = [];
      byVehicle[p.vehicle_id].push(p);
    }

    for (const [vehicleId, pts] of Object.entries(byVehicle)) {
      const vehicleName = (pts[0] as any).vehicles?.name ?? vehicleId.slice(0, 8);

      // ── Anomalie de vitesse (haversine entre points consécutifs) ──
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dt = (new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()) / 1000; // secondes
        if (dt <= 0 || dt > 3600) continue; // gap trop grand, pas significatif

        const distKm = haversineKm(a.lat, a.lng, b.lat, b.lng);
        const speedKmh = (distKm / dt) * 3600;

        if (speedKmh > 200) {
          flags.push({
            vehicleId,
            vehicleName,
            flagType: "speed_anomaly",
            severity: "high",
            description: `Vitesse impossible : ${Math.round(speedKmh)} km/h entre deux points (${dt}s d'écart, ${distKm.toFixed(2)} km)`,
            detectedAt: b.recorded_at,
            samplePoints: [
              { lat: a.lat, lng: a.lng, recordedAt: a.recorded_at },
              { lat: b.lat, lng: b.lng, recordedAt: b.recorded_at },
            ],
          });
        }
      }

      // ── GPS statique (spoofing : >80% des points au même endroit) ──
      if (pts.length >= 20) {
        const roundedCoords = pts.map((p) => `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`);
        const freq: Record<string, number> = {};
        for (const c of roundedCoords) freq[c] = (freq[c] ?? 0) + 1;
        const maxFreq = Math.max(...Object.values(freq));
        const ratio = maxFreq / pts.length;
        if (ratio > 0.8) {
          const [topCoord] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
          const [lat, lng] = topCoord.split(",").map(Number);
          flags.push({
            vehicleId,
            vehicleName,
            flagType: "static_spoofing",
            severity: "high",
            description: `${Math.round(ratio * 100)}% des ${pts.length} points GPS sont au même endroit (${topCoord}) — probable usurpation GPS`,
            detectedAt: pts[pts.length - 1].recorded_at,
            samplePoints: [{ lat, lng, recordedAt: pts[0].recorded_at }],
          });
        }
      }

      // ── Absence de mouvement sur une longue session (>4h, <0.5 km parcourus) ──
      if (pts.length >= 10) {
        const sessionDuration =
          (new Date(pts[pts.length - 1].recorded_at).getTime() -
            new Date(pts[0].recorded_at).getTime()) /
          3600000;
        if (sessionDuration > 4) {
          let totalDist = 0;
          for (let i = 1; i < pts.length; i++) {
            totalDist += haversineKm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
          }
          if (totalDist < 0.5) {
            flags.push({
              vehicleId,
              vehicleName,
              flagType: "no_movement",
              severity: "medium",
              description: `${sessionDuration.toFixed(1)}h de session GPS mais seulement ${(totalDist * 1000).toFixed(0)}m parcourus — véhicule immobile`,
              detectedAt: pts[pts.length - 1].recorded_at,
            });
          }
        }
      }
    }

    return { flags, analyzedPoints: positions.length };
  });

// Formule haversine (distance en km entre deux coordonnées GPS)
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Détection fraude identité / paiement ─────────────────────────────────────

export type IdentityFraudFlag = {
  flagType: "duplicate_siret" | "duplicate_phone" | "suspicious_payment_pattern";
  severity: "high" | "medium";
  description: string;
  affectedUserIds: string[];
};

export const adminDetectIdentityFraud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: adminRow } = await supabase.from("admin_profiles").select("id").maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const flags: IdentityFraudFlag[] = [];

    // ── SIRET en double ──
    const { data: advProfiles } = await supabaseAdmin
      .from("advertiser_profiles")
      .select("user_id, siret, full_name")
      .not("siret", "is", null);

    const siretMap: Record<string, string[]> = {};
    for (const p of advProfiles ?? []) {
      if (!(p as any).siret) continue;
      const s = (p as any).siret.replace(/\s/g, "");
      if (!siretMap[s]) siretMap[s] = [];
      siretMap[s].push((p as any).user_id);
    }
    for (const [siret, userIds] of Object.entries(siretMap)) {
      if (userIds.length > 1) {
        flags.push({
          flagType: "duplicate_siret",
          severity: "high",
          description: `SIRET ${siret} utilisé par ${userIds.length} comptes annonceurs différents`,
          affectedUserIds: userIds,
        });
      }
    }

    // ── Paiements suspects (montants très élevés en peu de temps, mêmes campagnes) ──
    const { data: recentTxs } = await supabaseAdmin
      .from("wallet_transactions")
      .select("user_id, amount_cents, created_at, kind")
      .eq("kind", "credit")
      .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
      .order("created_at");

    const userTotals: Record<string, number> = {};
    for (const tx of recentTxs ?? []) {
      userTotals[(tx as any).user_id] =
        (userTotals[(tx as any).user_id] ?? 0) + ((tx as any).amount_cents ?? 0);
    }
    for (const [userId, total] of Object.entries(userTotals)) {
      if (total > 1000000) {
        // > 10 000 € en 7 jours (en centimes)
        flags.push({
          flagType: "suspicious_payment_pattern",
          severity: "medium",
          description: `${(total / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} crédités en 7 jours sur un même compte`,
          affectedUserIds: [userId],
        });
      }
    }

    return { flags };
  });
