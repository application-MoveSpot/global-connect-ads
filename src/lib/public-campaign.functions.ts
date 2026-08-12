import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
