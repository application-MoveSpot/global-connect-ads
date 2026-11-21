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
    .select(
      "id, spot_name, company, email, start_date, end_date, user_id, setup_fee_cents, setup_fee_charged, pose_location_type, travel_supplement_charged, owner_amount_cents",
    )
    .eq("id", params.campaignRequestId)
    .maybeSingle();
  if (error || !campaign) throw new Error("Campagne introuvable");

  const { data: settlement, error: rpcError } = await (
    supabaseAdmin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{
      data: { already_paid?: boolean; amount_cents?: number } | null;
      error: { message: string } | null;
    }>
  )("settle_campaign_from_wallet", {
    p_campaign_request_id: params.campaignRequestId,
    p_description: params.description,
  });
  if (rpcError) throw new Error(rpcError.message);
  const row = Array.isArray(settlement) ? settlement[0] : settlement;
  if (!row || row.already_paid) return { ok: true, alreadyPaid: true };

  const amountCents = Number(row.amount_cents);

  // Notification automatique de l'annonceur — n'interrompt jamais le règlement.
  if (campaign.email) {
    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : undefined);
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
        trackingUrl: `https://move-spot.com/advertiser/suivi/${campaign.id}`,
      },
    });
  }

  // Débit du forfait mise en service (CGV Art. 2) — idempotent.
  const setupFeeCents = Number((campaign as { setup_fee_cents?: number }).setup_fee_cents ?? 0);
  const setupFeeCharged = Boolean((campaign as { setup_fee_charged?: boolean }).setup_fee_charged);
  if (setupFeeCents > 0 && !setupFeeCharged) {
    await supabaseAdmin.rpc("apply_wallet_transaction" as never, {
      p_user_id: (campaign as { user_id?: string }).user_id,
      p_kind: "campaign_debit",
      p_amount_cents: -setupFeeCents,
      p_description: `Forfait mise en service — ${campaign.spot_name}`,
      p_campaign_request_id: campaign.id,
    } as never);
    await supabaseAdmin
      .from("campaign_requests")
      .update({ setup_fee_charged: true } as never)
      .eq("id", campaign.id);
  }

  // Supplément déplacement (CGU Art. 11bis) — déduit des gains propriétaire si pose à domicile.
  const travelCharged = Boolean(
    (campaign as { travel_supplement_charged?: boolean }).travel_supplement_charged,
  );
  const poseType = (campaign as { pose_location_type?: string | null }).pose_location_type;
  if (poseType === "domicile" && !travelCharged) {
    const { TRAVEL_SUPPLEMENT_TTC_CENTS } = await import("@/lib/payments/setup-fee");
    const ownerNet = Number(
      (campaign as { owner_amount_cents?: number | null }).owner_amount_cents ?? 0,
    );
    const netAfterTravel = Math.max(0, ownerNet - TRAVEL_SUPPLEMENT_TTC_CENTS);
    await supabaseAdmin
      .from("campaign_requests")
      .update({
        travel_supplement_cents: TRAVEL_SUPPLEMENT_TTC_CENTS,
        travel_supplement_charged: true,
        owner_amount_cents: netAfterTravel,
      } as never)
      .eq("id", campaign.id);
  }

  // Virement automatique de la part propriétaire via Stripe Connect.
  // Non-bloquant : si l'owner n'a pas encore connecté son compte, on skippe
  // silencieusement — l'admin peut déclencher le virement manuellement.
  const { triggerOwnerTransfer } = await import("@/lib/payments/transfer-to-owner.server");
  await triggerOwnerTransfer(params.campaignRequestId);

  return { ok: true, amountCents };
}
