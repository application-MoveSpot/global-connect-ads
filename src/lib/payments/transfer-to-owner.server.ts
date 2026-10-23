import { captureServerException } from "@/lib/sentry.server";

type TransferResult =
  | { status: "transferred"; transferId: string }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

/**
 * Déclenche le virement Stripe Connect de la part propriétaire (owner_amount_cents)
 * après le règlement d'une campagne. Non-bloquant : un échec est loggé mais
 * ne fait pas échouer le règlement côté annonceur.
 *
 * Ignoré silencieusement si le propriétaire n'a pas encore complété son onboarding
 * Stripe Connect — l'admin peut déclencher le virement manuellement ensuite.
 */
export async function triggerOwnerTransfer(campaignRequestId: string): Promise<TransferResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: campaign } = await supabaseAdmin
      .from("campaign_requests")
      .select(
        "id, vehicle_id, owner_amount_cents, payment_status, payout_status, stripe_transfer_id, spot_name",
      )
      .eq("id", campaignRequestId)
      .single();

    if (!campaign) return { status: "skipped", reason: "campagne introuvable" };
    if (campaign.payment_status !== "paid")
      return { status: "skipped", reason: "campagne non payée" };
    if (campaign.payout_status === "transferred" || campaign.stripe_transfer_id) {
      return { status: "skipped", reason: "déjà viré" };
    }
    if (!campaign.owner_amount_cents || (campaign.owner_amount_cents as number) <= 0) {
      return { status: "skipped", reason: "montant nul" };
    }
    if (!campaign.vehicle_id) return { status: "skipped", reason: "pas de véhicule" };

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("owner_id")
      .eq("id", campaign.vehicle_id)
      .single();
    if (!vehicle?.owner_id) return { status: "skipped", reason: "pas de propriétaire" };

    const { data: ownerRaw } = await (
      supabaseAdmin as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (
              col: string,
              val: string,
            ) => {
              single: () => Promise<{
                data: {
                  stripe_account_id: string | null;
                  stripe_payouts_enabled: boolean;
                  vigilance_statut: string | null;
                } | null;
              }>;
            };
          };
        };
      }
    )
      .from("owner_profiles")
      .select("stripe_account_id, stripe_payouts_enabled, vigilance_statut")
      .eq("id", vehicle.owner_id)
      .single();

    if (!ownerRaw?.stripe_account_id) {
      return { status: "skipped", reason: "propriétaire sans compte Stripe Connect" };
    }
    if (!ownerRaw.stripe_payouts_enabled) {
      return { status: "skipped", reason: "compte Stripe pas encore actif" };
    }

    // Contrôle vigilance Urssaf (Art. L.8222-1 Code du travail)
    if (ownerRaw.vigilance_statut === "BLOQUE") {
      await supabaseAdmin
        .from("campaign_requests")
        .update({ payout_status: "blocked" } as never)
        .eq("id", campaign.id);
      return { status: "skipped", reason: "vigilance Urssaf bloquée — virement différé" };
    }

    const { createStripeClient, getDefaultStripeEnvironment } = await import("./stripe.server");
    const stripe = createStripeClient(getDefaultStripeEnvironment());

    const transfer = await stripe.transfers.create({
      amount: campaign.owner_amount_cents as number,
      currency: "eur",
      destination: ownerRaw.stripe_account_id,
      description: `Reversement campagne — ${campaign.spot_name}`,
      metadata: { campaign_request_id: campaign.id },
    });

    await supabaseAdmin
      .from("campaign_requests")
      .update({
        stripe_transfer_id: transfer.id,
        payout_status: "transferred",
        owner_transferred_at: new Date().toISOString(),
      } as never)
      .eq("id", campaign.id);

    return { status: "transferred", transferId: transfer.id };
  } catch (err) {
    captureServerException(err, { category: "payment", extra: { campaignRequestId } });
    return {
      status: "failed",
      error: err instanceof Error ? err.message : "erreur inconnue",
    };
  }
}
