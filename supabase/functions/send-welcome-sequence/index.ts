/**
 * send-welcome-sequence
 *
 * Handles two modes:
 *   - welcome: sends the immediate welcome email after a new profile is created
 *              called by an AFTER INSERT trigger on advertiser_profiles / owner_profiles
 *   - batch-followup: scans users who registered N days ago and haven't completed
 *                     the activation step; called by a pg_cron daily job
 *
 * Uses enqueue_email RPC so the existing process-email-queue function dispatches via Resend.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = "https://move-spot.com";
const FROM_NAME = "MoveSpot";
const FROM_DOMAIN = "notify.move-spot.com";
const SENDER_DOMAIN = "notify.move-spot.com";

// ─── HTML helpers ────────────────────────────────────────────────────────────

function htmlWrap(preview: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="fr" dir="ltr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${FROM_NAME}</title>
</head>
<body style="background-color:#f8fafc;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;margin:0;padding:0">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preview}</div>
<div style="max-width:560px;margin:32px auto">
  <div style="background-color:#0f172a;padding:0">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;padding:0 24px">
      <tr>
        <td style="padding:18px 0"><p style="font-size:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;margin:0">MoveSpot</p></td>
        <td align="right" style="padding:18px 0"><p style="font-size:11px;color:#94a3b8;margin:0;letter-spacing:0.3px">Publicité mobile sur véhicules</p></td>
      </tr>
    </table>
  </div>
  <div style="background-color:#6366f1;height:3px"></div>
  <div style="background-color:#ffffff;border-radius:0 0 12px 12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
    <div style="padding:28px 28px 0">
${body}
    </div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0 0">
    <div style="padding:0 24px 24px">
      <p style="font-size:13px;font-weight:700;color:#374151;margin:0 0 4px;letter-spacing:1px;text-transform:uppercase">MoveSpot</p>
      <p style="font-size:11px;line-height:1.6;color:#6b7280;margin:0 0 2px">RAKOUN KLUB — 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault (Guadeloupe, France)</p>
      <p style="font-size:11px;color:#9ca3af;margin-top:8px">Cet email est envoyé depuis ${SENDER_DOMAIN}. Il ne contient aucun pixel de traçage.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 8px"><tr><td>
    <a href="${href}" style="background-color:#0f172a;color:#ffffff;border-radius:8px;padding:13px 22px;font-size:15px;font-weight:600;text-decoration:none;display:inline-block">${label}</a>
  </td></tr></table>`;
}

function infoBox(title: string, rows: string[]): string {
  const rowHtml = rows.map((r) => `<p style="font-size:14px;line-height:1.6;color:#374151;margin:0 0 8px;padding-left:6px">${r}</p>`).join("");
  return `<div style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:16px 18px;margin:20px 0">
    <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#6b7280;margin:0 0 12px">${title}</p>
    ${rowHtml}
  </div>`;
}

// ─── Email builders ──────────────────────────────────────────────────────────

function buildAdvertiserWelcome(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const greeting = name ? `Bienvenue ${name} !` : "Bienvenue !";
  const subject = name
    ? `Bienvenue ${name} — votre espace MoveSpot est prêt`
    : "Bienvenue sur MoveSpot — votre espace annonceur est prêt";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 🎉</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Votre compte annonceur MoveSpot est activé. Vous pouvez dès maintenant lancer votre première campagne de publicité mobile sur véhicules.</p>
    ${infoBox("Ce que vous pouvez faire", [
      "✅ Créer un brief et cibler une zone géographique",
      "✅ Recevoir des propositions de flottes locales",
      "✅ Suivre votre campagne en temps réel (km, couverture)",
      "✅ Gérer votre portefeuille et vos factures",
    ])}
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Besoin d'aide pour démarrer ? Notre FAQ répond aux questions les plus courantes — accessible depuis votre espace annonceur.</p>
    ${ctaButton(`${SITE_URL}/advertiser`, "Accéder à mon espace annonceur")}`;

  const text = `${greeting}\n\nVotre compte annonceur MoveSpot est activé.\n\nAccéder à votre espace : ${SITE_URL}/advertiser\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(subject, body), text };
}

function buildAdvertiserDay3(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, votre campagne MoveSpot vous attend — démarrez dès aujourd'hui`
    : "Votre campagne MoveSpot vous attend — démarrez dès aujourd'hui";
  const previewText = name
    ? `${name}, votre campagne MoveSpot peut démarrer dès aujourd'hui`
    : "Votre campagne MoveSpot peut démarrer dès aujourd'hui";

  const intro = name
    ? `${name}, vous n'avez pas encore lancé votre campagne…`
    : "Vous n'avez pas encore lancé votre campagne…";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${intro}</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">On comprend — vous avez peut-être des questions sur le suivi. Voici ce que nos annonceurs voient en temps réel une fois leur campagne lancée&nbsp;:</p>
    <div style="background-color:#0f172a;border-radius:10px;padding:20px 18px;margin:20px 0">
      <p style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 16px;text-align:center">Tableau de bord tracker en direct</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="text-align:center;padding:0 12px"><p style="font-size:26px;font-weight:700;color:#6366f1;margin:0 0 4px;line-height:1.2">2 847</p><p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.4px">km parcourus</p></td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e293b;border-right:1px solid #1e293b"><p style="font-size:26px;font-weight:700;color:#10b981;margin:0 0 4px;line-height:1.2">94&nbsp;%</p><p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.4px">dans votre zone</p></td>
        <td style="text-align:center;padding:0 12px"><p style="font-size:26px;font-weight:700;color:#f59e0b;margin:0 0 4px;line-height:1.2">12 300</p><p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.4px">impressions est.</p></td>
      </tr></table>
    </div>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Le tracker GPS MoveSpot vous montre précisément où circulent vos véhicules, combien de temps ils restent dans votre zone cible, et l'estimation d'impressions quotidienne. <strong>Transparent, sans surprise.</strong></p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Votre première campagne peut démarrer en moins de 10 minutes. Choisissez votre zone, sélectionnez votre durée et recevez des propositions de flottes locales.</p>
    ${ctaButton(`${SITE_URL}/commencer`, "Simuler ma première campagne")}`;

  const text = `${intro}\n\nSimulez votre première campagne : ${SITE_URL}/commencer\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(previewText, body), text };
}

function buildOwnerWelcome(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const greeting = name ? `Bienvenue ${name} sur MoveSpot !` : "Bienvenue sur MoveSpot !";
  const subject = name
    ? `Bienvenue ${name} — activez vos paiements MoveSpot`
    : "Bienvenue — activez vos paiements MoveSpot";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 🚗</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Votre espace propriétaire est activé. Pour commencer à recevoir des offres de campagnes et être payé directement, une seule étape reste à faire&nbsp;: connecter votre compte bancaire via Stripe.</p>
    ${infoBox("3 étapes pour commencer à gagner", [
      "✅ Compte propriétaire créé",
      "🔗 <span style='color:#6366f1;font-weight:600'>Associer votre compte bancaire (Stripe Connect)</span>",
      "<span style='color:#9ca3af'>⏳ Recevoir vos premières propositions de campagnes</span>",
    ])}
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Stripe Connect est utilisé par des milliers d'entreprises pour sécuriser les virements. L'intégration prend 5 minutes et vos virements sont automatiques après chaque campagne validée.</p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Revenus moyens constatés sur MoveSpot&nbsp;: <strong>120 à 280 €/mois</strong> par véhicule selon la zone et la disponibilité.</p>
    ${ctaButton(`${SITE_URL}/proprietaire`, "Associer mon compte bancaire")}
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:10px 0 8px">Besoin d'aide ? Répondez à cet email ou consultez notre FAQ depuis votre espace propriétaire.</p>`;

  const text = `${greeting}\n\nAssociez votre compte bancaire pour recevoir vos paiements : ${SITE_URL}/proprietaire\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(subject, body), text };
}

function buildOwnerDay2(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, finalisez votre profil propriétaire MoveSpot`
    : "Finalisez votre profil propriétaire MoveSpot";
  const intro = name ? `${name}, il manque encore la dernière étape 🔧` : "Il manque encore la dernière étape 🔧";
  const previewText = name
    ? `${name}, il ne reste qu'une étape pour recevoir vos premières offres MoveSpot`
    : "Il ne reste qu'une étape pour recevoir vos premières offres MoveSpot";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${intro}</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Votre espace propriétaire est prêt, mais votre configuration n'est pas encore complète. Les annonceurs ne peuvent pas vous faire de propositions tant que votre compte bancaire n'est pas lié et/ou votre véhicule non renseigné.</p>
    <div style="background-color:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#92400e;font-weight:600;margin:0 0 8px">⚠️ Ce qu'il reste à faire</p>
      <p style="font-size:13px;line-height:1.65;color:#78350f;margin:0">Associez votre compte bancaire Stripe et renseignez les informations de votre véhicule (type, photos, disponibilités). Cela prend moins de 10 minutes.</p>
    </div>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Une fois votre profil complet, votre véhicule apparaîtra dans les résultats des annonceurs qui ciblent votre zone. Les premières propositions arrivent généralement dans les 48h.</p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Rappel&nbsp;: vos paiements sont automatiques et sécurisés via Stripe — vous êtes payé directement sur votre compte bancaire après chaque campagne validée.</p>
    ${ctaButton(`${SITE_URL}/proprietaire`, "Finaliser la configuration de mon véhicule")}`;

  const text = `${intro}\n\nFinalisez votre configuration : ${SITE_URL}/proprietaire\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(previewText, body), text };
}

// ─── Enqueue helper ──────────────────────────────────────────────────────────

async function enqueueWelcomeEmail(
  supabase: ReturnType<typeof createClient>,
  recipientEmail: string,
  templateName: string,
  content: { subject: string; html: string; text: string },
  idempotencyKey: string,
) {
  const messageId = `${idempotencyKey}-${Date.now()}`;

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipientEmail,
    status: "pending",
  } as never);

  const { error } = await supabase.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: recipientEmail,
      from: `${FROM_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: content.subject,
      html: content.html,
      text: content.text,
      purpose: "transactional",
      label: templateName,
      idempotency_key: idempotencyKey,
      queued_at: new Date().toISOString(),
    },
  } as never);

  if (error) {
    console.error(`[send-welcome-sequence] enqueue_email failed for ${templateName}:`, error);
    return false;
  }

  console.log(`[send-welcome-sequence] queued ${templateName} → ${recipientEmail} (key=${idempotencyKey})`);
  return true;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleWelcome(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  role: "advertiser" | "vehicle_owner",
) {
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) {
    console.warn(`[send-welcome-sequence] no email for user ${userId}`);
    return new Response(JSON.stringify({ ok: false, reason: "no_email" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  let firstName: string | null = null;

  if (role === "advertiser") {
    const { data: profile } = await supabase
      .from("advertiser_profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    firstName = profile?.full_name?.split(" ")[0] ?? null;
    const content = buildAdvertiserWelcome(firstName);
    await enqueueWelcomeEmail(supabase, email, "advertiser-welcome", content, `welcome-adv-${userId}`);
  } else if (role === "vehicle_owner") {
    const { data: profile } = await supabase
      .from("owner_profiles")
      .select("full_name")
      .eq("user_id", userId)
      .maybeSingle();
    firstName = profile?.full_name?.split(" ")[0] ?? null;
    const content = buildOwnerWelcome(firstName);
    await enqueueWelcomeEmail(supabase, email, "owner-welcome", content, `welcome-own-${userId}`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleBatchFollowup(supabase: ReturnType<typeof createClient>) {
  const now = new Date();
  const stats = { advertiserDay3: 0, ownerDay2: 0, skipped: 0, errors: 0 };

  // ── PARCOURS A: Advertiser J+3 ──────────────────────────────────────────
  // Target: advertisers who registered ~3 days ago with no campaign created
  const adDay3Start = new Date(now);
  adDay3Start.setDate(adDay3Start.getDate() - 4);
  const adDay3End = new Date(now);
  adDay3End.setDate(adDay3End.getDate() - 3);

  const { data: advertiserProfiles } = await supabase
    .from("advertiser_profiles")
    .select("user_id, full_name, created_at")
    .gte("created_at", adDay3Start.toISOString())
    .lt("created_at", adDay3End.toISOString());

  for (const profile of advertiserProfiles ?? []) {
    try {
      // Check if any campaign was created
      const { count } = await supabase
        .from("campaign_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile.user_id);

      if ((count ?? 0) > 0) {
        stats.skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) { stats.skipped++; continue; }

      const firstName = profile.full_name?.split(" ")[0] ?? null;
      const content = buildAdvertiserDay3(firstName);
      const sent = await enqueueWelcomeEmail(
        supabase, email, "advertiser-welcome-day3", content,
        `followup-adv-day3-${profile.user_id}`,
      );
      if (sent) stats.advertiserDay3++;
      else stats.errors++;
    } catch (err) {
      console.error(`[send-welcome-sequence] error processing advertiser ${profile.user_id}:`, err);
      stats.errors++;
    }
  }

  // ── PARCOURS B: Owner J+2 ───────────────────────────────────────────────
  // Target: owners who registered ~2 days ago with Stripe not configured
  const owDay2Start = new Date(now);
  owDay2Start.setDate(owDay2Start.getDate() - 3);
  const owDay2End = new Date(now);
  owDay2End.setDate(owDay2End.getDate() - 2);

  const { data: ownerProfiles } = await supabase
    .from("owner_profiles")
    .select("user_id, full_name, created_at, stripe_connect_account_id, stripe_details_submitted")
    .gte("created_at", owDay2Start.toISOString())
    .lt("created_at", owDay2End.toISOString());

  for (const profile of ownerProfiles ?? []) {
    try {
      // Skip if Stripe is already configured
      if (profile.stripe_connect_account_id && profile.stripe_details_submitted) {
        stats.skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) { stats.skipped++; continue; }

      const firstName = profile.full_name?.split(" ")[0] ?? null;
      const content = buildOwnerDay2(firstName);
      const sent = await enqueueWelcomeEmail(
        supabase, email, "owner-welcome-day2", content,
        `followup-own-day2-${profile.user_id}`,
      );
      if (sent) stats.ownerDay2++;
      else stats.errors++;
    } catch (err) {
      console.error(`[send-welcome-sequence] error processing owner ${profile.user_id}:`, err);
      stats.errors++;
    }
  }

  console.log("[send-welcome-sequence] batch-followup done", stats);
  return new Response(JSON.stringify({ ok: true, stats }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Entry point ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[send-welcome-sequence] SUPABASE_SERVICE_ROLE_KEY not configured");
    return new Response(JSON.stringify({ error: "service key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { emailType, userId, role } = body as {
    emailType?: string;
    userId?: string;
    role?: string;
  };

  if (emailType === "welcome" && typeof userId === "string" && typeof role === "string") {
    if (role !== "advertiser" && role !== "vehicle_owner") {
      return new Response(JSON.stringify({ ok: true, skipped: "unsupported_role" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return await handleWelcome(supabase, userId, role as "advertiser" | "vehicle_owner");
  }

  if (emailType === "batch-followup") {
    return await handleBatchFollowup(supabase);
  }

  return new Response(JSON.stringify({ error: "invalid emailType" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
});
