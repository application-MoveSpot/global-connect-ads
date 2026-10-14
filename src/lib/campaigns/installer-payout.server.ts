/**
 * Logique de virement Stripe pour les poseurs (pose et dépose).
 * Appelé par les server fns admin après validation.
 */

export async function payInstallerFee(
  campaignRequestId: string,
  type: "pose" | "depose",
): Promise<{ ok: true; transferId: string; alreadyDone?: true }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const payoutStatusCol = type === "pose" ? "pose_payout_status" : "depose_payout_status";
  const transferIdCol = type === "pose" ? "pose_stripe_transfer_id" : "depose_stripe_transfer_id";
  const feeCentsCol = type === "pose" ? "pose_fee_cents" : "depose_fee_cents";
  const installerUserIdCol =
    type === "pose" ? "pose_installer_user_id" : "depose_installer_user_id";
  const photosCol = type === "pose" ? "installation_photos" : "depose_photos";

  const { data: campaign, error } = await supabaseAdmin
    .from("campaign_requests")
    .select(
      `id, spot_name, ${feeCentsCol}, ${installerUserIdCol}, ${photosCol}, ${payoutStatusCol}, ${transferIdCol}`,
    )
    .eq("id", campaignRequestId)
    .maybeSingle();

  if (error || !campaign) throw new Error("Campagne introuvable");

  const cr = campaign as Record<string, unknown>;

  // Idempotency
  if (cr[payoutStatusCol] === "transferred" || cr[transferIdCol]) {
    return { ok: true, transferId: cr[transferIdCol] as string, alreadyDone: true };
  }

  const feeCents = cr[feeCentsCol] as number | null;
  if (!feeCents || feeCents <= 0) {
    throw new Error(`Montant ${type === "pose" ? "pose" : "dépose"} invalide ou nul.`);
  }

  // Resolve installer user_id (column first, fallback JSONB claimed_by)
  let installerUserId = cr[installerUserIdCol] as string | null;
  if (!installerUserId) {
    const photos = cr[photosCol] as { claimed_by?: string } | null;
    installerUserId = photos?.claimed_by ?? null;
  }
  if (!installerUserId) {
    throw new Error(
      "Poseur introuvable pour cette mission — aucun utilisateur n'a réclamé le job.",
    );
  }

  // Fetch payee Stripe account
  const { data: payee } = await supabaseAdmin
    .from("payee_profiles")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("user_id", installerUserId)
    .maybeSingle();

  if (!payee?.stripe_account_id) {
    throw new Error(
      "Le poseur n'a pas encore connecté son compte Stripe. Demandez-lui de finaliser l'onboarding.",
    );
  }
  if (!payee.stripe_payouts_enabled) {
    throw new Error("Le compte Stripe du poseur n'est pas encore actif (onboarding incomplet).");
  }

  const { createStripeClient, getDefaultStripeEnvironment } =
    await import("@/lib/payments/stripe.server");
  const stripe = createStripeClient(getDefaultStripeEnvironment());

  const spotName = cr["spot_name"] as string | null;
  const transfer = await stripe.transfers.create({
    amount: feeCents,
    currency: "eur",
    destination: payee.stripe_account_id,
    description: `Forfait ${type === "pose" ? "pose" : "dépose"} — ${spotName ?? campaignRequestId}`,
    metadata: { campaign_request_id: campaignRequestId, type },
  });

  // Update campaign_request
  await supabaseAdmin
    .from("campaign_requests")
    .update({
      [payoutStatusCol]: "transferred",
      [transferIdCol]: transfer.id,
    } as never)
    .eq("id", campaignRequestId);

  // Insert into payee_earnings for poseur dashboard tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabaseAdmin as any).from("payee_earnings").insert({
    payee_user_id: installerUserId,
    campaign_request_id: campaignRequestId,
    amount_cents: feeCents,
    currency: "eur",
    description: `Forfait ${type === "pose" ? "pose" : "dépose"} — ${spotName ?? campaignRequestId}`,
    status: "paid",
    stripe_transfer_id: transfer.id,
    paid_at: new Date().toISOString(),
  });

  return { ok: true, transferId: transfer.id };
}
