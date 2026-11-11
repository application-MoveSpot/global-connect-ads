/**
 * send-driver-installation-sms
 *
 * Envoie un SMS au chauffeur dont le véhicule est programmé pour une
 * installation publicitaire. Appelé via pg_net depuis un trigger SQL sur
 * installation_missions (AFTER INSERT).
 *
 * Provider : Brevo (ex-Sendinblue) — plan gratuit disponible
 * Auth     : x-internal-secret header
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET")!;

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }

  // ── Auth interne ───────────────────────────────────────────────────────────
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== INTERNAL_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const {
      mission_id,
      mission_type,
      campaign_request_id,
      scheduled_date,
      scheduled_time_slot,
      location_address,
      location_city,
    } = body;

    if (!mission_id || !campaign_request_id) {
      return new Response(
        JSON.stringify({ error: "mission_id et campaign_request_id requis" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // ── Récupérer le véhicule lié à la campagne ────────────────────────────
    const { data: campaign, error: campaignErr } = await supabase
      .from("campaign_requests")
      .select("vehicle_id")
      .eq("id", campaign_request_id)
      .maybeSingle();

    if (campaignErr || !campaign?.vehicle_id) {
      console.warn(
        "send-driver-installation-sms: vehicle_id introuvable pour campaign",
        campaign_request_id,
        campaignErr?.message
      );
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_vehicle" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Récupérer le chauffeur via le véhicule ─────────────────────────────
    const { data: vehicle, error: vehicleErr } = await supabase
      .from("vehicles")
      .select("name, driver_id")
      .eq("id", campaign.vehicle_id)
      .maybeSingle();

    if (vehicleErr || !vehicle?.driver_id) {
      console.warn(
        "send-driver-installation-sms: driver_id introuvable pour vehicle",
        campaign.vehicle_id,
        vehicleErr?.message
      );
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_driver" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Récupérer le téléphone du chauffeur ────────────────────────────────
    const { data: driver, error: driverErr } = await supabase
      .from("drivers")
      .select("full_name, phone")
      .eq("id", vehicle.driver_id)
      .maybeSingle();

    if (driverErr || !driver?.phone) {
      console.warn(
        "send-driver-installation-sms: téléphone introuvable pour driver",
        vehicle.driver_id,
        driverErr?.message
      );
      return new Response(
        JSON.stringify({ skipped: true, reason: "no_phone" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── Construire le message SMS ──────────────────────────────────────────
    const actionLabel =
      mission_type === "depose" ? "dépose de publicité" : "pose de publicité";

    const dateStr = scheduled_date
      ? new Date(scheduled_date + "T12:00:00").toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : null;

    const slotStr =
      scheduled_time_slot && scheduled_time_slot !== "flexible"
        ? ` (${scheduled_time_slot})`
        : "";

    const locationStr = location_address
      ? location_address + (location_city ? `, ${location_city}` : "")
      : location_city ?? "";

    let messageBody = `Bonjour ${driver.full_name},\n`;
    messageBody += `Une ${actionLabel} est planifiée sur votre véhicule ${vehicle.name ?? ""}`;
    if (dateStr) messageBody += ` le ${dateStr}${slotStr}`;
    if (locationStr) messageBody += ` à ${locationStr}`;
    messageBody += `.\nMerci d'assurer la disponibilité de votre véhicule.\n— MoveSpot`;

    // ── Envoyer via Brevo Transactional SMS API ────────────────────────────
    const brevoRes = await fetch(
      "https://api.brevo.com/v3/transactionalSMS/sms",
      {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          sender: "MoveSpot",
          recipient: driver.phone,
          content: messageBody,
          type: "transactional",
        }),
      }
    );

    const brevoData = await brevoRes.json();

    if (!brevoRes.ok) {
      console.error("send-driver-installation-sms: Brevo error", brevoData);
      return new Response(
        JSON.stringify({ error: "brevo_error", details: brevoData }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `send-driver-installation-sms: SMS envoyé au chauffeur ${driver.full_name} (${driver.phone}) pour mission ${mission_id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message_id: brevoData.messageId,
        driver_phone: driver.phone,
        mission_id,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-driver-installation-sms error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
