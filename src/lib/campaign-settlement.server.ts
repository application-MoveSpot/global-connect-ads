/**
 * Règlement d'une campagne depuis le portefeuille (source unique de vérité).
 * Débite le solde annonceur, marque la campagne payée et calcule la répartition 70/30.
 *
 * Le débit du portefeuille et le passage en "payée" sont effectués dans une
 * unique transaction Postgres (RPC `settle_campaign_from_wallet`) : si l'un des
 * deux échoue, l'autre est annulé — impossible de débiter sans marquer payé
 * (ce qui provoquerait un double débit si l'annonceur retentait le paiement).
 */
export async function settleCampaignFromWallet(params: {
  campaignRequestId: string;
  /** Description de l'écriture portefeuille (débit campagne). */
  description?: string;
}): Promise<{ ok: true; alreadyPaid?: boolean; amountCents?: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: campaign, error } = await supabaseAdmin
    .from("campaign_requests")
    .select("id, spot_name, company, email, start_date, end_date")
    .eq("id", params.campaignRequestId)
    .maybeSingle();
  if (error || !campaign) throw new Error("Campagne introuvable");

  const { data: settlement, error: rpcError } = await supabaseAdmin
    .rpc("settle_campaign_from_wallet", {
      p_campaign_request_id: params.campaignRequestId,
      p_description: params.description,
    })
    .single();
  if (rpcError) throw new Error(rpcError.message);
  if (!settlement || settlement.already_paid) return { ok: true, alreadyPaid: true };

  const amountCents = Number(settlement.amount_cents);

  // Notification automatique de l'annonceur — n'interrompt jamais le règlement.
  if (campaign.email) {
    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    const fmtDate = (d: string | null) =>
      d ? new Date(d).toLocaleDateString("fr-FR") : undefined;
    await sendAppEmailSafe({
      templateName: "campaign-activated",
      recipientEmail: campaign.email,
      idempotencyKey: `campaign-activated-${campaign.id}`,
      templateData: {
        company: campaign.company ?? undefined,
        campaignName: campaign.spot_name ?? undefined,
        startDate: fmtDate(campaign.start_date),
        endDate: fmtDate(campaign.end_date),
        amount: (amountCents / 100).toLocaleString("fr-FR", {
          style: "currency",
          currency: "EUR",
        }),
        trackingUrl: `https://move-spot.com/annonceur/suivi/${campaign.id}`,
      },
    });
  }

  return { ok: true, amountCents };
}

