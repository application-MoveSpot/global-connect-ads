import { createClient } from "npm:@supabase/supabase-js@2";

// Supabase auto-injects SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY into all edge functions.
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── Email helper ─────────────────────────────────────────────────────────────

function emailHtml(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0}
    .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:8px;padding:32px;border:1px solid #e5e7eb}
    h2{color:#1e293b;margin-top:0} p{color:#374151;line-height:1.6}
    .btn{display:inline-block;background:#0ea5e9;color:#fff!important;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:16px}
    .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af}
  </style></head><body><div class="wrap">${content}</div></body></html>`;
}

async function enqueueEmail(params: {
  to: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  label: string;
  idempotencyKey?: string;
}) {
  try {
    const normalized = params.to.toLowerCase().trim();
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("id")
      .eq("email", normalized)
      .maybeSingle();
    if (suppressed) return;

    const messageId = crypto.randomUUID();
    await supabase.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: params.to,
        from: "MoveSpot <noreply@notify.move-spot.com>",
        sender_domain: "notify.move-spot.com",
        subject: params.subject,
        html: params.htmlContent,
        text: params.textContent,
        purpose: "transactional",
        label: params.label,
        idempotency_key: params.idempotencyKey ?? messageId,
        queued_at: new Date().toISOString(),
      },
    });
  } catch {
    /* best-effort */
  }
}

async function sendPush(userId: string, payload: { title: string; body?: string; url?: string }) {
  if (!ANON_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ userId, ...payload }),
    });
  } catch {
    /* best-effort */
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-cron-secret, content-type" },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Auth: accept service role key OR CRON_SECRET as Bearer / x-cron-secret / ?secret
  const url = new URL(req.url);
  const token =
    req.headers.get("x-cron-secret") ??
    req.headers.get("authorization")?.replace("Bearer ", "").trim() ??
    url.searchParams.get("secret");
  const validTokens = [SERVICE_ROLE_KEY, CRON_SECRET].filter(Boolean);
  if (!token || !validTokens.includes(token)) {
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results: Record<string, unknown> = {};
  const now = new Date();

  // ── 1. Unpaid approved campaigns → reminders at 3d / 6d, expiration at 7d ──
  try {
    const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();
    const { data: unpaidCampaigns } = await supabase
      .from("campaign_requests")
      .select("id, spot_name, company, email, user_id, created_at, total_price")
      .eq("status", "approved")
      .neq("payment_status", "paid")
      .lte("created_at", threeDaysAgo)
      .order("created_at", { ascending: true });

    const paymentResults = { reminders3d: 0, reminders6d: 0, expired: 0 };

    await Promise.allSettled(
      (unpaidCampaigns ?? []).map(async (c) => {
        const cr = c as { id: string; spot_name: string; company: string; email: string; user_id: string | null; created_at: string; total_price: number | null };
        const ageDays = Math.floor((now.getTime() - new Date(cr.created_at).getTime()) / 86_400_000);

        if (ageDays >= 7) {
          await supabase.from("campaign_requests").update({ status: "expired" } as never).eq("id", cr.id);
          await enqueueEmail({
            to: cr.email,
            subject: `❌ Campagne annulée — ${cr.spot_name}`,
            htmlContent: emailHtml(`<h2>Campagne annulée</h2>
              <p>Bonjour ${cr.company},</p>
              <p>Votre campagne <strong>"${cr.spot_name}"</strong> a été annulée faute de paiement dans les 7 jours suivant son approbation.</p>
              <p>Vous pouvez soumettre une nouvelle demande depuis votre espace annonceur.</p>
              <a href="https://move-spot.com/annonceur" class="btn">Mon espace annonceur</a>
              <div class="footer">MoveSpot — Publicité mobile sur véhicules</div>`),
            textContent: `Bonjour ${cr.company}, votre campagne "${cr.spot_name}" a été annulée faute de paiement. Connectez-vous sur https://move-spot.com/annonceur pour soumettre une nouvelle demande.`,
            label: "campaign-expired-notice",
            idempotencyKey: `expired-${cr.id}`,
          });
          if (cr.user_id) {
            await sendPush(cr.user_id, { title: "❌ Campagne annulée", body: `La campagne "${cr.spot_name}" a été annulée faute de paiement.`, url: "/annonceur" });
          }
          paymentResults.expired++;
        } else if (ageDays >= 6) {
          const daysLeft = 7 - ageDays;
          const price = cr.total_price ? `${cr.total_price} €` : "";
          await enqueueEmail({
            to: cr.email,
            subject: `⚠️ Dernier délai — paiement requis avant ${daysLeft} jour(s)`,
            htmlContent: emailHtml(`<h2>Paiement urgent requis</h2>
              <p>Bonjour ${cr.company},</p>
              <p>Votre campagne <strong>"${cr.spot_name}"</strong>${price ? ` (${price})` : ""} sera <strong>automatiquement annulée dans ${daysLeft} jour(s)</strong> si le paiement n'est pas effectué.</p>
              <a href="https://move-spot.com/annonceur" class="btn">Payer maintenant</a>
              <div class="footer">MoveSpot — Publicité mobile sur véhicules</div>`),
            textContent: `Bonjour ${cr.company}, votre campagne "${cr.spot_name}" sera annulée dans ${daysLeft} jour(s) sans paiement. Réglez sur https://move-spot.com/annonceur`,
            label: "campaign-payment-reminder",
            idempotencyKey: `reminder-6d-${cr.id}`,
          });
          if (cr.user_id) {
            await sendPush(cr.user_id, { title: "⚠️ Paiement urgent", body: `Dernière chance — votre campagne "${cr.spot_name}" expire dans ${daysLeft} jour(s).`, url: "/annonceur" });
          }
          paymentResults.reminders6d++;
        } else if (ageDays >= 3) {
          const daysLeft = 7 - ageDays;
          const price = cr.total_price ? `${cr.total_price} €` : "";
          await enqueueEmail({
            to: cr.email,
            subject: `💳 Rappel paiement — "${cr.spot_name}"`,
            htmlContent: emailHtml(`<h2>Rappel : paiement en attente</h2>
              <p>Bonjour ${cr.company},</p>
              <p>Votre campagne <strong>"${cr.spot_name}"</strong>${price ? ` (${price})` : ""} a été approuvée mais attend votre paiement. Il vous reste <strong>${daysLeft} jour(s)</strong>.</p>
              <a href="https://move-spot.com/annonceur" class="btn">Finaliser le paiement</a>
              <div class="footer">MoveSpot — Publicité mobile sur véhicules</div>`),
            textContent: `Bonjour ${cr.company}, votre campagne "${cr.spot_name}" attend votre paiement (${daysLeft}j restants). Réglez sur https://move-spot.com/annonceur`,
            label: "campaign-payment-reminder",
            idempotencyKey: `reminder-3d-${cr.id}`,
          });
          if (cr.user_id) {
            await sendPush(cr.user_id, { title: "💳 Rappel paiement", body: `Votre campagne "${cr.spot_name}" est en attente de paiement (${daysLeft}j restants).`, url: "/annonceur" });
          }
          paymentResults.reminders3d++;
        }
      }),
    );
    results.payment = paymentResults;
  } catch (e) {
    results.payment = { error: String(e) };
  }

  // ── 2. Installation overdue (> 2 days after campaign start) ─────────────────
  try {
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
    const { data: overdueInstallations } = await supabase
      .from("campaign_requests")
      .select("id, spot_name, start_date, vehicle_id, user_id")
      .eq("payment_status", "paid")
      .eq("installation_status", "pending")
      .lte("start_date", twoDaysAgo);

    const installResults = { remindersSent: 0 };
    const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

    await Promise.allSettled(
      (overdueInstallations ?? []).map(async (c) => {
        const cr = c as { id: string; spot_name: string; start_date: string | null; vehicle_id: string | null; user_id: string | null };
        if (!cr.vehicle_id) return;

        const { data: vehicle } = await supabase.from("vehicles").select("name, driver_id, owner_id").eq("id", cr.vehicle_id).maybeSingle();
        if (!vehicle) return;
        const veh = vehicle as { name: string; driver_id: string | null; owner_id: string };
        const delayDays = cr.start_date ? Math.floor((now.getTime() - new Date(cr.start_date).getTime()) / 86_400_000) : 0;

        if (veh.driver_id) {
          const { data: driver } = await supabase.from("drivers").select("full_name, email, user_id").eq("id", veh.driver_id).maybeSingle();
          const drv = driver as { full_name: string; email: string | null; user_id: string | null } | null;
          if (drv?.email) {
            await enqueueEmail({
              to: drv.email,
              subject: `🔧 Pose en retard — "${cr.spot_name}"`,
              htmlContent: emailHtml(`<h2>Confirmation de pose requise</h2>
                <p>Bonjour ${drv.full_name},</p>
                <p>La pose de la publicité <strong>"${cr.spot_name}"</strong> prévue le ${fmtDate(cr.start_date)} accuse un retard de <strong>${delayDays} jour(s)</strong>.</p>
                <p>Merci de confirmer la pose dès que possible depuis votre espace chauffeur.</p>
                <a href="https://move-spot.com/chauffeur/espace" class="btn">Confirmer la pose</a>
                <div class="footer">MoveSpot — Publicité mobile sur véhicules</div>`),
              textContent: `Bonjour ${drv.full_name}, la pose pour "${cr.spot_name}" a ${delayDays} jour(s) de retard. Confirmez sur https://move-spot.com/chauffeur/espace`,
              label: "installation-overdue",
              idempotencyKey: `install-overdue-driver-${cr.id}`,
            });
          }
          if (drv?.user_id) {
            await sendPush(drv.user_id, { title: "🔧 Confirmation de pose requise", body: `La pose pour "${cr.spot_name}" est en retard (${delayDays}j). Confirmez dès que possible.`, url: "/chauffeur/espace" });
          }
        }

        const ownerAuth = await supabase.auth.admin.getUserById(veh.owner_id);
        const ownerEmail = ownerAuth.data?.user?.email;
        if (ownerEmail) {
          await enqueueEmail({
            to: ownerEmail,
            subject: `🔧 Pose non confirmée — "${cr.spot_name}"`,
            htmlContent: emailHtml(`<h2>Pose non confirmée</h2>
              <p>La pose de la publicité <strong>"${cr.spot_name}"</strong> prévue le ${fmtDate(cr.start_date)} sur le véhicule <strong>"${veh.name}"</strong> n'a pas encore été confirmée (retard : ${delayDays} jour(s)).</p>
              <a href="https://move-spot.com/proprietaire" class="btn">Voir ma flotte</a>
              <div class="footer">MoveSpot — Publicité mobile sur véhicules</div>`),
            textContent: `Pose non confirmée pour "${cr.spot_name}" sur "${veh.name}" (${delayDays}j de retard). Vérifiez sur https://move-spot.com/proprietaire`,
            label: "installation-overdue",
            idempotencyKey: `install-overdue-owner-${cr.id}`,
          });
        }
        await sendPush(veh.owner_id, { title: "🔧 Pose non confirmée", body: `La pose pour "${cr.spot_name}" sur "${veh.name}" est en retard.`, url: "/proprietaire" });
        installResults.remindersSent++;
      }),
    );
    results.installation = installResults;
  } catch (e) {
    results.installation = { error: String(e) };
  }

  // ── 3. GPS inactivity (no points yesterday for active campaigns) ─────────────
  try {
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
    const todayStr = now.toISOString().slice(0, 10);

    const { data: activeCampaigns } = await supabase
      .from("campaign_requests")
      .select("id, spot_name, vehicle_id")
      .eq("payment_status", "paid")
      .lte("start_date", todayStr)
      .gte("end_date", todayStr)
      .not("vehicle_id", "is", null);

    const gpsResults = { alertsSent: 0 };

    await Promise.allSettled(
      (activeCampaigns ?? []).map(async (c) => {
        const cr = c as { id: string; spot_name: string; vehicle_id: string };
        const { data: metrics } = await supabase
          .from("campaign_metrics")
          .select("points_total")
          .eq("campaign_request_id", cr.id)
          .eq("day", yesterday)
          .maybeSingle();

        if (((metrics as { points_total: number } | null)?.points_total ?? 0) > 0) return;

        const { data: vehicle } = await supabase.from("vehicles").select("name, owner_id").eq("id", cr.vehicle_id).maybeSingle();
        if (!vehicle) return;
        const veh = vehicle as { name: string; owner_id: string };

        const ownerAuth = await supabase.auth.admin.getUserById(veh.owner_id);
        const ownerEmail = ownerAuth.data?.user?.email;
        if (ownerEmail) {
          await enqueueEmail({
            to: ownerEmail,
            subject: `📍 GPS inactif hier — "${veh.name}"`,
            htmlContent: emailHtml(`<h2>Alerte GPS : inactivité</h2>
              <p>Aucun point GPS n'a été reçu hier pour le véhicule <strong>"${veh.name}"</strong> (campagne <strong>"${cr.spot_name}"</strong>).</p>
              <p>Vérifiez que le suivi GPS est bien activé sur le véhicule.</p>
              <a href="https://move-spot.com/proprietaire/tracking" class="btn">Voir le suivi GPS</a>
              <div class="footer">MoveSpot — Publicité mobile sur véhicules</div>`),
            textContent: `Aucun point GPS hier pour "${veh.name}" (campagne "${cr.spot_name}"). Démarrez le suivi sur https://move-spot.com/proprietaire/tracking`,
            label: "gps-inactivity-alert",
            idempotencyKey: `gps-inactive-${cr.id}-${yesterday}`,
          });
        }
        await sendPush(veh.owner_id, { title: "📍 GPS inactif", body: `Aucun point GPS hier pour "${veh.name}" (campagne "${cr.spot_name}"). Démarrez le suivi.`, url: "/proprietaire/tracking" });
        gpsResults.alertsSent++;
      }),
    );
    results.gps = gpsResults;
  } catch (e) {
    results.gps = { error: String(e) };
  }

  // ── 4. Proactive brief matching ↔ fleets ─────────────────────────────────────
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const { data: recentBriefs } = await supabase
      .from("advertiser_briefs")
      .select("id, title, vehicle_types")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false });

    const { data: approvedVehicles } = await supabase
      .from("vehicles")
      .select("id, type, owner_profiles!inner(user_id, full_name)")
      .eq("status", "approved");

    const matchingStats = { notified: 0 };

    if (recentBriefs?.length && approvedVehicles?.length) {
      type OwnerBucket = { userId: string; name: string; types: Set<string> };
      const ownerMap = new Map<string, OwnerBucket>();
      for (const v of approvedVehicles) {
        const prof = (v as unknown as Record<string, unknown>).owner_profiles as { user_id: string; full_name: string } | null;
        if (!prof) continue;
        if (!ownerMap.has(prof.user_id)) {
          ownerMap.set(prof.user_id, { userId: prof.user_id, name: prof.full_name ?? "", types: new Set() });
        }
        ownerMap.get(prof.user_id)!.types.add(String(v.type));
      }

      for (const [, owner] of ownerMap) {
        const compatible = recentBriefs.filter((b) =>
          ((b.vehicle_types as string[] | null) ?? []).some((t) => owner.types.has(t)),
        );
        if (!compatible.length) continue;
        const top = compatible[0]!;
        await sendPush(owner.userId, {
          title: "🎯 Nouveaux briefs pour votre flotte",
          body: compatible.length === 1
            ? `"${top.title}" correspond à votre flotte — répondez en premier !`
            : `${compatible.length} briefs correspondent à votre flotte. Ne les ratez pas !`,
          url: "/proprietaire/briefs",
        }).catch(() => {/* best-effort */});
        matchingStats.notified++;
      }
    }
    results.matching = matchingStats;
  } catch {
    results.matching = { error: "matching skipped" };
  }

  // ── 5. AI visual auto-moderation ─────────────────────────────────────────────
  try {
    const twoDaysAgoIso = new Date(now.getTime() - 2 * 86_400_000).toISOString();
    const { data: briefsWithCreatives } = await supabase
      .from("advertiser_briefs")
      .select("id, title, creative_files, advertiser_id")
      .gte("created_at", twoDaysAgoIso)
      .not("creative_files", "is", null);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const modStats = { analysed: 0, suspects: 0 };

    if (apiKey && briefsWithCreatives?.length) {
      const { data: admins } = await supabase.from("user_roles" as never).select("user_id").eq("role" as never, "admin");

      for (const brief of briefsWithCreatives) {
        const files = (brief.creative_files as string[] | null) ?? [];
        for (const storagePath of files.slice(0, 2)) {
          const { data: urlData } = await supabase.storage.from("campaign-creatives").createSignedUrl(storagePath, 60);
          if (!urlData?.signedUrl) continue;
          try {
            const imgResp = await fetch(urlData.signedUrl);
            if (!imgResp.ok) continue;
            const buf = await imgResp.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
            const mimeType = imgResp.headers.get("content-type") ?? "image/jpeg";

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: "google/gemini-2.0-flash",
                messages: [{ role: "user", content: [
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
                  { type: "text", text: 'Analyse ce visuel publicitaire. Réponds en JSON: {"safe":true/false,"score_risque":0-100,"verdict":"conforme"|"suspect"|"interdit","issues":[]}. Score > 50 = suspect.' },
                ]}],
                temperature: 0.1,
                max_tokens: 150,
              }),
            });

            modStats.analysed++;
            if (aiResp.ok) {
              const json = await aiResp.json() as { choices?: Array<{ message?: { content?: string } }> };
              const raw = json.choices?.[0]?.message?.content ?? "{}";
              let parsed: { score_risque?: number; verdict?: string } = {};
              try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { /* ignore */ }
              const score = Number(parsed.score_risque ?? 0);
              if (score >= 50) {
                modStats.suspects++;
                for (const admin of (admins ?? []) as Array<{ user_id: string }>) {
                  await sendPush(admin.user_id, {
                    title: "🚨 Visuel suspect détecté",
                    body: `Brief "${brief.title}" : visuel avec score risque ${score}/100. Vérifiez dans Modération IA.`,
                    url: "/admin/dashboard",
                  }).catch(() => {/* best-effort */});
                }
              }
            }
          } catch { /* best-effort per file */ }
        }
      }
    }
    results.autoModeration = modStats;
  } catch {
    results.autoModeration = { error: "auto-moderation skipped" };
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});
