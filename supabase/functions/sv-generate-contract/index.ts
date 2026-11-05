import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface GenerateContractRequest {
  campaign_id: string;
  trigger: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: GenerateContractRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { campaign_id } = body;
  if (!campaign_id) {
    return new Response("Missing campaign_id", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Load campaign with all parties
  const { data: campaign, error: campErr } = await supabase
    .from("campaign_requests")
    .select(`
      id, user_id, vehicle_id, start_date, end_date,
      paid_amount_cents, owner_amount_cents, pose_fee_cents, depose_fee_cents,
      pose_installer_user_id, depose_installer_user_id
    `)
    .eq("id", campaign_id)
    .single();

  if (campErr || !campaign) {
    return new Response(JSON.stringify({ error: "Campaign not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Resolve vehicle owner
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("owner_id")
    .eq("id", campaign.vehicle_id)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  const created: string[] = [];

  // Helper: generate contract markdown content
  function buildContractMd(type: string, partyUserId: string): string {
    return [
      `# Contrat — ${type}`,
      ``,
      `**Date** : ${today}`,
      `**Campagne** : ${campaign_id}`,
      `**Partie** : ${partyUserId}`,
      ``,
      `## Objet`,
      `Contrat de ${type} pour la campagne publicitaire mobile.`,
      `**Période** : ${campaign.start_date} → ${campaign.end_date}`,
      ``,
      `## Rémunération`,
      type === "advertiser_campaign"
        ? `Montant total payé : ${((campaign.paid_amount_cents ?? 0) / 100).toFixed(2)} EUR`
        : type === "owner_hosting"
        ? `Rémunération propriétaire : ${((campaign.owner_amount_cents ?? 0) / 100).toFixed(2)} EUR`
        : type === "installer_pose"
        ? `Rémunération pose : ${((campaign.pose_fee_cents ?? 0) / 100).toFixed(2)} EUR`
        : `Rémunération dépose : ${((campaign.depose_fee_cents ?? 0) / 100).toFixed(2)} EUR`,
      ``,
      `## Conditions générales`,
      `Ce contrat est soumis aux CGU de la plateforme MoveSpot en vigueur.`,
      ``,
      `_Généré automatiquement par le Secrétariat Virtuel MoveSpot_`,
    ].join("\n");
  }

  // Upsert contracts for each party
  const contractDefs: Array<{ type: string; userId: string | null }> = [
    { type: "advertiser_campaign", userId: campaign.user_id },
    { type: "owner_hosting", userId: vehicle?.owner_id ?? null },
    { type: "installer_pose", userId: campaign.pose_installer_user_id },
    { type: "installer_depose", userId: campaign.depose_installer_user_id },
  ];

  for (const def of contractDefs) {
    if (!def.userId) continue;

    const existing = await supabase
      .from("sv_contracts")
      .select("id")
      .eq("campaign_request_id", campaign_id)
      .eq("contract_type", def.type)
      .eq("party_user_id", def.userId)
      .maybeSingle();

    if (existing.data) continue; // already exists

    await supabase.from("sv_contracts").insert({
      campaign_request_id: campaign_id,
      contract_type: def.type,
      party_user_id: def.userId,
      status: "sent",
      content_md: buildContractMd(def.type, def.userId),
      expires_at: expires,
    });

    // Notify party
    await supabase.from("notifications").insert({
      user_id: def.userId,
      type: "contract_ready",
      payload: { campaign_id, contract_type: def.type },
    }).throwOnError().catch(() => null);

    created.push(`${def.type}:${def.userId}`);
  }

  console.log(`[sv-generate-contract] campaign=${campaign_id} created=${created.join(",") || "none"}`);

  return new Response(
    JSON.stringify({ ok: true, created }),
    { headers: { "Content-Type": "application/json" } }
  );
});
