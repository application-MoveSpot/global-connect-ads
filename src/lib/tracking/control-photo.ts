import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Fenêtre de réponse accordée au chauffeur : 5 minutes
const DEADLINE_MINUTES = 5;

// base64 brut JPEG/PNG/WebP (sans préfixe data:...) — max ~2 MB encodé
const PhotoSchema = z.string().max(3_000_000);

// ─── Admin : déclenche une demande de photo de contrôle ──────────────────────
export const scheduleControlPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        campaignRequestId: z.string().uuid(),
        vehicleId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;

    const { data: adminRow } = await supabase
      .from("admin_profiles")
      .select("id")
      .maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Vérifie qu'il n'y a pas déjà une demande en attente sur ce véhicule
    const { data: existing } = await supabaseAdmin
      .from("control_photo_requests")
      .select("id, deadline_at")
      .eq("vehicle_id", data.vehicleId)
      .eq("status", "pending")
      .maybeSingle();

    if (existing && new Date(existing.deadline_at) > new Date()) {
      return { ok: false, reason: "Une demande est déjà en attente." };
    }

    // Retrouve le driver_id associé au véhicule
    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("driver_id")
      .eq("id", data.vehicleId)
      .maybeSingle();

    const now = new Date();
    const deadline = new Date(now.getTime() + DEADLINE_MINUTES * 60_000);

    const { data: created, error } = await supabaseAdmin
      .from("control_photo_requests")
      .insert({
        campaign_request_id: data.campaignRequestId,
        vehicle_id: data.vehicleId,
        driver_id: vehicle?.driver_id ?? null,
        scheduled_at: now.toISOString(),
        deadline_at: deadline.toISOString(),
      })
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Notification push au chauffeur
    const { pushNotification } = await import("@/hooks/useNotifications");
    if (vehicle?.driver_id) {
      const { data: driverUser } = await supabaseAdmin
        .from("drivers")
        .select("user_id")
        .eq("id", vehicle.driver_id)
        .maybeSingle();
      if (driverUser?.user_id) {
        await pushNotification({
          userId: driverUser.user_id,
          title: "Photo de contrôle demandée",
          body: `MoveSpot demande une photo de votre véhicule dans les ${DEADLINE_MINUTES} minutes.`,
          type: "control_photo",
          referenceId: created?.id ?? null,
        }).catch(() => void 0);
      }
    }

    return { ok: true, requestId: created?.id ?? null, deadline: deadline.toISOString() };
  });

// ─── Chauffeur : récupère la demande en attente (s'il y en a une) ────────────
export const getDriverControlPhotoRequest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ vehicleId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifie que le chauffeur est bien assigné à ce véhicule
    const { data: driverRec } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driverRec) return { request: null };

    const { data: row } = await supabase
      .from("control_photo_requests")
      .select("id, deadline_at, scheduled_at")
      .eq("vehicle_id", data.vehicleId)
      .eq("driver_id", driverRec.id)
      .eq("status", "pending")
      .gt("deadline_at", new Date().toISOString())
      .order("scheduled_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { request: row ?? null };
  });

// ─── Chauffeur : soumet la photo de réponse ──────────────────────────────────
export const submitControlPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        requestId: z.string().uuid(),
        photo: PhotoSchema,
        photoMimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
        lat: z.number().min(-90).max(90).nullable().optional(),
        lng: z.number().min(-180).max(180).nullable().optional(),
        accuracy: z.number().nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: driverRec } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!driverRec) throw new Error("Profil chauffeur introuvable.");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Recharge la demande pour vérifier le délai côté serveur (anti-triche)
    const { data: req } = await supabaseAdmin
      .from("control_photo_requests")
      .select("id, deadline_at, vehicle_id, driver_id, status")
      .eq("id", data.requestId)
      .maybeSingle();

    if (!req) throw new Error("Demande introuvable.");
    if (req.driver_id !== driverRec.id) throw new Error("Accès refusé.");
    if (req.status !== "pending") throw new Error("Cette demande n'est plus en attente.");

    const now = new Date();
    if (now > new Date(req.deadline_at)) {
      // Expire si le délai est dépassé, même si le client essaie de l'envoyer
      await supabaseAdmin
        .from("control_photo_requests")
        .update({ status: "expired" })
        .eq("id", req.id);
      await recomputeTrustScore(supabaseAdmin, driverRec.id);
      throw new Error(
        `Le délai de ${DEADLINE_MINUTES} minutes est écoulé. La demande est expirée.`,
      );
    }

    // Upload de la photo
    const ext = data.photoMimeType === "image/png" ? "png" : data.photoMimeType === "image/webp" ? "webp" : "jpg";
    const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const path = `${req.vehicle_id}/${ts}.${ext}`;
    const buf = Buffer.from(data.photo, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("control-photos")
      .upload(path, buf, { contentType: data.photoMimeType, upsert: false });
    if (upErr) throw new Error(`Erreur upload : ${upErr.message}`);

    // Analyse des anomalies GPS
    const fraudFlags: string[] = [];
    if (data.lat == null || data.lng == null) {
      fraudFlags.push("no_gps");
    }

    const { error: updateErr } = await supabaseAdmin
      .from("control_photo_requests")
      .update({
        status: "submitted",
        submitted_at: now.toISOString(),
        photo_path: path,
        photo_lat: data.lat ?? null,
        photo_lng: data.lng ?? null,
        photo_accuracy: data.accuracy ?? null,
        fraud_flags: fraudFlags,
      })
      .eq("id", req.id);
    if (updateErr) throw new Error(updateErr.message);

    return { ok: true, photoPath: path };
  });

// ─── Admin : valider / rejeter une photo de contrôle ────────────────────────
export const adminReviewControlPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        requestId: z.string().uuid(),
        decision: z.enum(["validated", "rejected"]),
        notes: z.string().max(500).optional(),
        fraudFlags: z.array(z.string()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const { data: adminRow } = await supabase
      .from("admin_profiles")
      .select("id")
      .maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: req } = await supabaseAdmin
      .from("control_photo_requests")
      .select("driver_id, fraud_flags")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!req) throw new Error("Demande introuvable.");

    const mergedFlags = [
      ...((req.fraud_flags as string[]) ?? []),
      ...(data.fraudFlags ?? []),
    ];

    const { error } = await supabaseAdmin
      .from("control_photo_requests")
      .update({
        status: data.decision,
        admin_validated: data.decision === "validated",
        admin_notes: data.notes ?? null,
        fraud_flags: mergedFlags,
      })
      .eq("id", data.requestId);
    if (error) throw new Error(error.message);

    if (req.driver_id) {
      await recomputeTrustScore(supabaseAdmin, req.driver_id);
    }

    return { ok: true };
  });

// ─── Liste des demandes de contrôle pour l'admin ─────────────────────────────
export const adminListControlPhotoRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const { data: adminRow } = await supabase
      .from("admin_profiles")
      .select("id")
      .maybeSingle();
    if (!adminRow) throw new Error("Accès refusé.");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data, error } = await supabaseAdmin
      .from("control_photo_requests")
      .select(
        "id, campaign_request_id, vehicle_id, driver_id, scheduled_at, deadline_at, status, submitted_at, photo_path, photo_lat, photo_lng, photo_accuracy, admin_validated, admin_notes, fraud_flags",
      )
      .order("scheduled_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { requests: data ?? [] };
  });

// ─── Annonceur : consulte les contrôles de ses campagnes ─────────────────────
export const getAdvertiserControlPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ campaignRequestId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifie que la campagne appartient à cet annonceur
    const { data: cr } = await supabase
      .from("campaign_requests")
      .select("id")
      .eq("id", data.campaignRequestId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!cr) throw new Error("Campagne introuvable.");

    const { data: rows, error } = await supabase
      .from("control_photo_requests")
      .select(
        "id, scheduled_at, deadline_at, status, submitted_at, admin_validated, fraud_flags",
      )
      .eq("campaign_request_id", data.campaignRequestId)
      .order("scheduled_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { controls: rows ?? [] };
  });

// ─── Génère une URL signée pour la photo d'un contrôle (admin / annonceur) ──
export const getControlPhotoUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ requestId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Vérifie l'accès : admin ou propriétaire de la campagne
    const { data: req } = await supabaseAdmin
      .from("control_photo_requests")
      .select("photo_path, campaign_request_id")
      .eq("id", data.requestId)
      .maybeSingle();
    if (!req?.photo_path) return { url: null };

    const isAdmin = !!(
      await supabase.from("admin_profiles").select("id").maybeSingle()
    ).data;
    if (!isAdmin) {
      const { data: cr } = await supabase
        .from("campaign_requests")
        .select("id")
        .eq("id", req.campaign_request_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!cr) throw new Error("Accès refusé.");
    }

    const { data: signed } = await supabaseAdmin.storage
      .from("control-photos")
      .createSignedUrl(req.photo_path, 3600);
    return { url: signed?.signedUrl ?? null };
  });

// ─── Recalcul du score de confiance ──────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recomputeTrustScore(supabaseAdmin: any, driverId: string) {
  const { data: allRequests } = await supabaseAdmin
    .from("control_photo_requests")
    .select("status, fraud_flags")
    .eq("driver_id", driverId);

  const requests = allRequests ?? [];
  const total = requests.length;
  const ok = requests.filter((r: { status: string }) => r.status === "validated").length;
  const expired = requests.filter((r: { status: string }) => r.status === "expired").length;
  const rejected = requests.filter((r: { status: string }) => r.status === "rejected").length;

  // Compte les flags fraude distincts (hors no_gps isolé)
  const fraudFlagCount = requests.reduce(
    (acc: number, r: { fraud_flags: string[] }) =>
      acc + (r.fraud_flags ?? []).filter((f: string) => f !== "no_gps").length,
    0,
  );

  // Score : base 100
  // -20 par contrôle expiré (non-réponse = suspect)
  // -30 par contrôle rejeté
  // -15 par flag fraude détecté
  // +0 par contrôle validé (pas de bonus, c'est la norme)
  let score = 100;
  if (total > 0) {
    score -= expired * 20;
    score -= rejected * 30;
    score -= fraudFlagCount * 15;
  }
  score = Math.max(0, Math.min(100, score));

  await supabaseAdmin.from("driver_trust_scores").upsert(
    {
      driver_id: driverId,
      score,
      control_requests_total: total,
      control_requests_ok: ok,
      control_requests_expired: expired,
      control_requests_rejected: rejected,
      gps_anomaly_flags: fraudFlagCount,
      last_updated_at: new Date().toISOString(),
    },
    { onConflict: "driver_id" },
  );
}

// ─── Lecture du score (annonceur / admin) ────────────────────────────────────
export const getDriverTrustScore = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ driverId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = context.supabase as any;
    const { data: row } = await supabase
      .from("driver_trust_scores")
      .select(
        "score, control_requests_total, control_requests_ok, control_requests_expired, control_requests_rejected, gps_anomaly_flags, zone_compliance_pct, last_updated_at",
      )
      .eq("driver_id", data.driverId)
      .maybeSingle();

    // Score 100 par défaut si aucun contrôle n'a encore eu lieu
    return {
      score: row ?? {
        score: 100,
        control_requests_total: 0,
        control_requests_ok: 0,
        control_requests_expired: 0,
        control_requests_rejected: 0,
        gps_anomaly_flags: 0,
        zone_compliance_pct: null,
        last_updated_at: null,
      },
    };
  });
