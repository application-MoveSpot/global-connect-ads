import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";

/**
 * Périodes déjà réservées (status=approved) pour un véhicule donné, à partir
 * d'aujourd'hui. Utilisé par BookingForm pour prévenir les conflits de dates
 * avant soumission. Ne remonte aucune donnée sensible : uniquement start_date/end_date.
 */
export const getVehicleBookedPeriods = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ vehicleId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertRateLimit(`booked-periods:${getRequestIp()}`, { maxRequests: 30, windowMs: 60_000 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const { data: bookings } = await supabaseAdmin
      .from("campaign_requests")
      .select("start_date, end_date")
      .eq("vehicle_id", data.vehicleId)
      .eq("status", "approved")
      .gte("end_date", today)
      .order("start_date");
    return (bookings ?? []) as Array<{ start_date: string; end_date: string }>;
  });

/**
 * Fiche publique minimale d'une campagne — utilisée par la page /c/$campaignId que le
 * QR code du kit poseur fait scanner aux passants. Ne remonte volontairement que le
 * strict nécessaire (aucune donnée de contact, tarif ou trajet) : c'est un appel service
 * role sans authentification, donc on choisit à la main ce qui est exposé plutôt que de
 * s'appuyer sur une policy RLS publique sur campaign_requests (qui contient des données
 * sensibles : email, message, prix, zone).
 */
export const getPublicCampaignInfo = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ campaignRequestId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    assertRateLimit(`campaign-info:${getRequestIp()}`, { maxRequests: 60, windowMs: 60_000 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select("company, spot_name")
      .eq("id", data.campaignRequestId)
      .eq("status", "approved")
      .maybeSingle();

    if (!campaign) return { found: false as const };
    return { found: true as const, company: campaign.company, spotName: campaign.spot_name };
  });
