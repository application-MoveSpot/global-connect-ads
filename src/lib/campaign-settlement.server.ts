/**
 * Règlement d'une campagne depuis le portefeuille (source unique de vérité).
 * Débite le solde annonceur, marque la campagne payée et calcule la répartition 70/30.
 */
export async function settleCampaignFromWallet(params: {
  campaignRequestId: string;
  /** Description de l'écriture portefeuille (débit campagne). */
  description?: string;
}): Promise<{ ok: true; alreadyPaid?: boolean; amountCents?: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: campaign, error } = await supabaseAdmin
    .from("campaign_requests")
    .select("id, user_id, total_price, status, payment_status, spot_name, company, email, start_date, end_date")
    .eq("id", params.campaignRequestId)
    .maybeSingle();
  if (error || !campaign) throw new Error("Campagne introuvable");
  if (campaign.payment_status === "paid") return { ok: true, alreadyPaid: true };
  if (!campaign.user_id) throw new Error("Campagne sans annonceur identifié");
  if (!campaign.total_price || Number(campaign.total_price) <= 0) throw new Error("Montant invalide");


  const amountCents = Math.round(Number(campaign.total_price) * 100);

  const { error: rpcError } = await supabaseAdmin.rpc("apply_wallet_transaction", {
    p_user_id: campaign.user_id,
    p_kind: "campaign_debit",
    p_amount_cents: -amountCents,
    p_description: params.description ?? `Paiement campagne — ${campaign.spot_name}`,
    p_campaign_request_id: campaign.id,
  });
  if (rpcError) throw new Error(rpcError.message);

  const ownerAmountCents = Math.round(amountCents * 0.7);
  const platformFeeCents = amountCents - ownerAmountCents;

  const { error: upErr } = await supabaseAdmin
    .from("campaign_requests")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      paid_amount_cents: amountCents,
      owner_amount_cents: ownerAmountCents,
      platform_fee_cents: platformFeeCents,
      payout_status: "pending",
    } as never)
    .eq("id", campaign.id);
  if (upErr) throw new Error(upErr.message);

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

