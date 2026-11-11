/**
 * send-welcome-sequence
 *
 * Handles three modes:
 *   - welcome: sends the immediate welcome email after a new profile is created
 *              called by an AFTER INSERT trigger on advertiser_profiles / owner_profiles
 *   - batch-followup: scans users who registered N days ago and haven't completed
 *                     the activation step; called by a pg_cron daily job
 *   - batch-activation: activation sequence for advertisers who haven't created a brief
 *                       J+1 (first nudge) and J+7 (final nudge + in-app notification)
 *                       secured by x-internal-secret header
 *
 * Uses enqueue_email RPC so the existing process-email-queue function dispatches via Resend.
 * Locale is determined by the user's country_code: 'DE' → German, all others → French.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_FUNCTION_SECRET = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
const SITE_URL = "https://move-spot.com";
const FROM_NAME = "MoveSpot";
const FROM_DOMAIN = "notify.move-spot.com";
const SENDER_DOMAIN = "notify.move-spot.com";

// ─── HTML helpers ────────────────────────────────────────────────────────────

function htmlWrap(preview: string, body: string, lang = "fr"): string {
  return `<!DOCTYPE html>
<html lang="${lang}" dir="ltr">
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
        <td align="right" style="padding:18px 0"><p style="font-size:11px;color:#94a3b8;margin:0;letter-spacing:0.3px">${lang === "de" ? "Mobile Fahrzeugwerbung" : "Publicité mobile sur véhicules"}</p></td>
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
      <p style="font-size:11px;color:#9ca3af;margin-top:8px">${lang === "de" ? `Diese E-Mail wird von ${SENDER_DOMAIN} versendet. Sie enthält kein Tracking-Pixel.` : `Cet email est envoyé depuis ${SENDER_DOMAIN}. Il ne contient aucun pixel de traçage.`}</p>
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

function langUrl(path: string, lang: string): string {
  return lang === "de" ? `${SITE_URL}${path}?lang=de` : `${SITE_URL}${path}`;
}

// ─── French email builders ───────────────────────────────────────────────────

function buildAdvertiserWelcomeFR(firstName: string | null): { subject: string; html: string; text: string } {
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
    ${ctaButton(langUrl("/advertiser", "fr"), "Accéder à mon espace annonceur")}`;

  const text = `${greeting}\n\nVotre compte annonceur MoveSpot est activé.\n\nAccéder à votre espace : ${SITE_URL}/advertiser\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(subject, body, "fr"), text };
}

function buildAdvertiserDay3FR(firstName: string | null): { subject: string; html: string; text: string } {
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
    ${ctaButton(langUrl("/commencer", "fr"), "Simuler ma première campagne")}`;

  const text = `${intro}\n\nSimulez votre première campagne : ${SITE_URL}/commencer\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(previewText, body, "fr"), text };
}

function buildOwnerWelcomeFR(firstName: string | null): { subject: string; html: string; text: string } {
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
    ${ctaButton(langUrl("/proprietaire", "fr"), "Associer mon compte bancaire")}
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:10px 0 8px">Besoin d'aide ? Répondez à cet email ou consultez notre FAQ depuis votre espace propriétaire.</p>`;

  const text = `${greeting}\n\nAssociez votre compte bancaire pour recevoir vos paiements : ${SITE_URL}/proprietaire\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(subject, body, "fr"), text };
}

function buildOwnerDay2FR(firstName: string | null): { subject: string; html: string; text: string } {
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
    ${ctaButton(langUrl("/proprietaire", "fr"), "Finaliser la configuration de mon véhicule")}`;

  const text = `${intro}\n\nFinalisez votre configuration : ${SITE_URL}/proprietaire\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(previewText, body, "fr"), text };
}

// ─── German email builders ───────────────────────────────────────────────────

function buildAdvertiserWelcomeDE(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const greeting = name ? `Willkommen bei MoveSpot, ${name}!` : "Willkommen bei MoveSpot!";
  const subject = name
    ? `Willkommen ${name} — Ihr MoveSpot-Konto ist bereit`
    : "Willkommen bei MoveSpot — Ihr Werbekonto ist aktiviert";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 🎉</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Ihr MoveSpot-Werbekonto ist aktiviert. Sie können jetzt Ihre erste mobile Fahrzeugwerbekampagne starten.</p>
    ${infoBox("Was Sie tun können", [
      "✅ Brief erstellen und geografische Zielzone festlegen",
      "✅ Angebote lokaler Fahrzeugflotten erhalten",
      "✅ Kampagne in Echtzeit verfolgen (km, Abdeckung)",
      "✅ Ihr Guthaben und Rechnungen verwalten",
    ])}
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Benötigen Sie Hilfe? Unser FAQ beantwortet die häufigsten Fragen — zugänglich über Ihren Werbebereich.</p>
    ${ctaButton(langUrl("/advertiser", "de"), "Zu meinem Werbebereich")}`;

  const text = `${greeting}\n\nIhr MoveSpot-Werbekonto ist aktiviert.\n\nZu Ihrem Bereich: ${SITE_URL}/advertiser?lang=de\n\n— Das MoveSpot-Team`;

  return { subject, html: htmlWrap(subject, body, "de"), text };
}

function buildAdvertiserDay3DE(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, Ihre MoveSpot-Kampagne wartet — starten Sie noch heute`
    : "Ihre MoveSpot-Kampagne wartet — starten Sie noch heute";
  const previewText = name
    ? `${name}, Ihre MoveSpot-Kampagne kann noch heute beginnen`
    : "Ihre MoveSpot-Kampagne kann noch heute beginnen";

  const intro = name
    ? `${name}, Sie haben Ihre Kampagne noch nicht gestartet…`
    : "Sie haben Ihre Kampagne noch nicht gestartet…";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${intro}</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Wir verstehen — vielleicht haben Sie noch Fragen zum Tracking. Hier sehen unsere Werbetreibenden in Echtzeit, sobald ihre Kampagne läuft:</p>
    <div style="background-color:#0f172a;border-radius:10px;padding:20px 18px;margin:20px 0">
      <p style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 16px;text-align:center">Live-Tracking-Dashboard</p>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="text-align:center;padding:0 12px"><p style="font-size:26px;font-weight:700;color:#6366f1;margin:0 0 4px;line-height:1.2">2 847</p><p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.4px">gefahrene km</p></td>
        <td style="text-align:center;padding:0 12px;border-left:1px solid #1e293b;border-right:1px solid #1e293b"><p style="font-size:26px;font-weight:700;color:#10b981;margin:0 0 4px;line-height:1.2">94&nbsp;%</p><p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.4px">in Ihrer Zone</p></td>
        <td style="text-align:center;padding:0 12px"><p style="font-size:26px;font-weight:700;color:#f59e0b;margin:0 0 4px;line-height:1.2">12 300</p><p style="font-size:11px;color:#64748b;margin:0;text-transform:uppercase;letter-spacing:0.4px">gesch. Impressionen</p></td>
      </tr></table>
    </div>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Der MoveSpot-GPS-Tracker zeigt Ihnen genau, wo Ihre Fahrzeuge unterwegs sind, wie lange sie in Ihrer Zielzone bleiben und die tägliche Impressionsschätzung. <strong>Transparent, ohne Überraschungen.</strong></p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Ihre erste Kampagne kann in weniger als 10 Minuten starten. Wählen Sie Ihre Zone, legen Sie die Dauer fest und erhalten Sie Angebote lokaler Flotten.</p>
    ${ctaButton(langUrl("/commencer", "de"), "Meine erste Kampagne simulieren")}`;

  const text = `${intro}\n\nSimulieren Sie Ihre erste Kampagne: ${SITE_URL}/commencer?lang=de\n\n— Das MoveSpot-Team`;

  return { subject, html: htmlWrap(previewText, body, "de"), text };
}

function buildOwnerWelcomeDE(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const greeting = name ? `Willkommen bei MoveSpot, ${name}!` : "Willkommen bei MoveSpot!";
  const subject = name
    ? `Willkommen ${name} — aktivieren Sie Ihre MoveSpot-Zahlungen`
    : "Willkommen — aktivieren Sie Ihre MoveSpot-Zahlungen";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 🚗</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Ihr Flottenbesitzer-Bereich ist aktiviert. Um Kampagnenangebote zu erhalten und direkt bezahlt zu werden, müssen Sie noch einen Schritt durchführen: Ihr Bankkonto über Stripe verbinden.</p>
    ${infoBox("3 Schritte, um zu verdienen", [
      "✅ Flottenbesitzer-Konto erstellt",
      "🔗 <span style='color:#6366f1;font-weight:600'>Bankkonto verknüpfen (Stripe Connect)</span>",
      "<span style='color:#9ca3af'>⏳ Erste Kampagnenangebote erhalten</span>",
    ])}
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Stripe Connect wird von tausenden Unternehmen für sichere Überweisungen genutzt. Die Integration dauert 5 Minuten und Ihre Zahlungen sind nach jeder bestätigten Kampagne automatisch.</p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Durchschnittliche Einnahmen bei MoveSpot: <strong>120 bis 280 €/Monat</strong> pro Fahrzeug je nach Zone und Verfügbarkeit.</p>
    ${ctaButton(langUrl("/proprietaire", "de"), "Mein Bankkonto verknüpfen")}
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:10px 0 8px">Benötigen Sie Hilfe? Antworten Sie auf diese E-Mail oder besuchen Sie unser FAQ in Ihrem Flottenbesitzer-Bereich.</p>`;

  const text = `${greeting}\n\nVerknüpfen Sie Ihr Bankkonto, um Zahlungen zu erhalten: ${SITE_URL}/proprietaire?lang=de\n\n— Das MoveSpot-Team`;

  return { subject, html: htmlWrap(subject, body, "de"), text };
}

function buildOwnerDay2DE(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, vervollständigen Sie Ihr MoveSpot-Flottenbesitzer-Profil`
    : "Vervollständigen Sie Ihr MoveSpot-Flottenbesitzer-Profil";
  const intro = name ? `${name}, der letzte Schritt fehlt noch 🔧` : "Der letzte Schritt fehlt noch 🔧";
  const previewText = name
    ? `${name}, nur noch ein Schritt, um Ihre ersten MoveSpot-Angebote zu erhalten`
    : "Nur noch ein Schritt, um Ihre ersten MoveSpot-Angebote zu erhalten";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${intro}</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Ihr Flottenbesitzer-Bereich ist bereit, aber Ihre Einrichtung ist noch nicht abgeschlossen. Werbetreibende können Ihnen keine Angebote machen, solange Ihr Bankkonto nicht verknüpft und/oder Ihr Fahrzeug nicht eingetragen ist.</p>
    <div style="background-color:#fef9c3;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#92400e;font-weight:600;margin:0 0 8px">⚠️ Was noch zu tun ist</p>
      <p style="font-size:13px;line-height:1.65;color:#78350f;margin:0">Verknüpfen Sie Ihr Stripe-Bankkonto und tragen Sie Ihre Fahrzeugdaten ein (Typ, Fotos, Verfügbarkeit). Das dauert weniger als 10 Minuten.</p>
    </div>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">Sobald Ihr Profil vollständig ist, erscheint Ihr Fahrzeug in den Ergebnissen der Werbetreibenden, die Ihre Zone anvisieren. Erste Angebote kommen in der Regel innerhalb von 48 Stunden.</p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">Erinnerung: Ihre Zahlungen sind automatisch und sicher über Stripe — Sie werden direkt auf Ihr Bankkonto nach jeder bestätigten Kampagne bezahlt.</p>
    ${ctaButton(langUrl("/proprietaire", "de"), "Meine Fahrzeugkonfiguration abschließen")}`;

  const text = `${intro}\n\nKonfiguration abschließen: ${SITE_URL}/proprietaire?lang=de\n\n— Das MoveSpot-Team`;

  return { subject, html: htmlWrap(previewText, body, "de"), text };
}

// ─── Locale-aware dispatcher ─────────────────────────────────────────────────

function buildAdvertiserWelcome(firstName: string | null, lang: string) {
  return lang === "de" ? buildAdvertiserWelcomeDE(firstName) : buildAdvertiserWelcomeFR(firstName);
}

function buildAdvertiserDay3(firstName: string | null, lang: string) {
  return lang === "de" ? buildAdvertiserDay3DE(firstName) : buildAdvertiserDay3FR(firstName);
}

function buildOwnerWelcome(firstName: string | null, lang: string) {
  return lang === "de" ? buildOwnerWelcomeDE(firstName) : buildOwnerWelcomeFR(firstName);
}

function buildOwnerDay2(firstName: string | null, lang: string) {
  return lang === "de" ? buildOwnerDay2DE(firstName) : buildOwnerDay2FR(firstName);
}

// ─── Activation J+1 ──────────────────────────────────────────────────────────

function buildAdvertiserDay1FR(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, créez votre premier brief MoveSpot — c'est rapide !`
    : "Créez votre premier brief MoveSpot — c'est rapide !";
  const previewText = name
    ? `${name}, votre espace annonceur vous attend. Lancez votre première campagne en 5 minutes.`
    : "Votre espace annonceur vous attend. Lancez votre première campagne en 5 minutes.";

  const greeting = name ? `${name}, bienvenue à nouveau !` : "Bienvenue à nouveau !";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 🎯</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">
      Votre compte annonceur MoveSpot est prêt. Il ne vous reste qu'une chose à faire&nbsp;:
      créer votre premier brief pour recevoir des propositions de flottes locales.
    </p>
    <div style="background-color:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#0369a1;font-weight:600;margin:0 0 8px">📋 En moins de 5 minutes, vous pouvez&nbsp;:</p>
      <ul style="font-size:13px;line-height:1.7;color:#0c4a6e;margin:0;padding-left:18px">
        <li>Dessiner votre zone de diffusion sur la carte</li>
        <li>Choisir la durée et le type de véhicules souhaités</li>
        <li>Uploader votre visuel publicitaire (ou le générer avec notre IA)</li>
        <li>Recevoir les premières propositions de propriétaires dans les 24h</li>
      </ul>
    </div>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 8px">
      Pas encore votre visuel ? Pas de souci — notre assistant IA peut vous aider à décrire votre message
      et générer un brief en quelques clics.
    </p>
    ${ctaButton(langUrl("/advertiser/briefs/nouveau", "fr"), "Créer mon premier brief")}`;

  const text = `${greeting}\n\nCréez votre premier brief en 5 minutes : ${SITE_URL}/advertiser/briefs/nouveau\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(previewText, body, "fr"), text };
}

function buildAdvertiserDay1DE(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, erstellen Sie Ihr erstes MoveSpot-Brief — es geht schnell!`
    : "Erstellen Sie Ihr erstes MoveSpot-Brief — es geht schnell!";
  const previewText = "Ihr Werbebereich wartet. Starten Sie Ihre erste Kampagne in 5 Minuten.";
  const greeting = name ? `${name}, herzlich willkommen zurück!` : "Herzlich willkommen zurück!";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 🎯</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">
      Ihr MoveSpot-Werbekonto ist bereit. Erstellen Sie Ihr erstes Brief, um Angebote von lokalen Fahrzeugflotten zu erhalten.
    </p>
    ${ctaButton(langUrl("/advertiser/briefs/nouveau", "de"), "Mein erstes Brief erstellen")}`;

  const text = `${greeting}\n\nErstellen Sie Ihr erstes Brief: ${SITE_URL}/advertiser/briefs/nouveau\n\n— Das MoveSpot-Team`;

  return { subject, html: htmlWrap(previewText, body, "de"), text };
}

function buildAdvertiserDay1(firstName: string | null, lang: string) {
  return lang === "de" ? buildAdvertiserDay1DE(firstName) : buildAdvertiserDay1FR(firstName);
}

// ─── Activation J+7 ──────────────────────────────────────────────────────────

function buildAdvertiserDay7FR(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, dernière chance — votre onboarding MoveSpot se termine bientôt`
    : "Dernière chance — votre onboarding MoveSpot se termine bientôt";
  const previewText = name
    ? `${name}, votre espace annonceur restera actif, mais nos relances personnalisées s'arrêtent aujourd'hui.`
    : "Votre espace annonceur restera actif, mais nos relances personnalisées s'arrêtent aujourd'hui.";

  const greeting = name ? `${name}, un dernier message de notre part` : "Un dernier message de notre part";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 👋</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">
      Vous vous êtes inscrit sur MoveSpot il y a 7 jours, mais n'avez pas encore créé de brief.
      C'est tout à fait normal — peut-être attendiez-vous le bon moment ou votre visuel.
    </p>
    <div style="background-color:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:20px 0">
      <p style="font-size:13px;color:#92400e;font-weight:600;margin:0 0 8px">⏰ Ce qui se passe maintenant</p>
      <p style="font-size:13px;line-height:1.65;color:#78350f;margin:0">
        Votre compte reste actif et opérationnel. Mais c'est notre dernier email de relance&nbsp;:
        après aujourd'hui, nous ne vous contacterons que si vous initiez vous-même une campagne.
      </p>
    </div>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">
      Si vous avez des questions ou si quelque chose vous a bloqué, répondez simplement à cet email.
      Notre équipe vous répond sous 24h.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#6b7280;margin:0 0 16px">
      Sinon, votre premier brief peut démarrer à tout moment — même dans 6 mois.
    </p>
    ${ctaButton(langUrl("/advertiser/briefs/nouveau", "fr"), "Je lance ma campagne maintenant")}`;

  const text = `${greeting}\n\nVotre compte reste actif. Lancez votre campagne quand vous voulez : ${SITE_URL}/advertiser/briefs/nouveau\n\n— L'équipe MoveSpot`;

  return { subject, html: htmlWrap(previewText, body, "fr"), text };
}

function buildAdvertiserDay7DE(firstName: string | null): { subject: string; html: string; text: string } {
  const name = firstName ?? "";
  const subject = name
    ? `${name}, letzte Chance — Ihr MoveSpot-Onboarding endet bald`
    : "Letzte Chance — Ihr MoveSpot-Onboarding endet bald";
  const previewText = "Ihr Konto bleibt aktiv, aber unsere personalisierten Erinnerungen enden heute.";
  const greeting = name ? `${name}, eine letzte Nachricht von uns` : "Eine letzte Nachricht von uns";

  const body = `
    <h1 style="font-size:22px;line-height:1.35;color:#0f172a;font-weight:700;margin:16px 0 12px">${greeting} 👋</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px">
      Sie haben sich vor 7 Tagen bei MoveSpot angemeldet, aber noch kein Brief erstellt. Ihr Konto bleibt aktiv.
    </p>
    ${ctaButton(langUrl("/advertiser/briefs/nouveau", "de"), "Jetzt meine Kampagne starten")}`;

  const text = `${greeting}\n\nStarten Sie Ihre Kampagne: ${SITE_URL}/advertiser/briefs/nouveau\n\n— Das MoveSpot-Team`;

  return { subject, html: htmlWrap(previewText, body, "de"), text };
}

function buildAdvertiserDay7(firstName: string | null, lang: string) {
  return lang === "de" ? buildAdvertiserDay7DE(firstName) : buildAdvertiserDay7FR(firstName);
}

function countryToLang(countryCode: string | null | undefined): string {
  return countryCode === "DE" ? "de" : "fr";
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
  let lang = "fr";

  if (role === "advertiser") {
    const { data: profile } = await supabase
      .from("advertiser_profiles")
      .select("full_name, country_code")
      .eq("user_id", userId)
      .maybeSingle();
    firstName = profile?.full_name?.split(" ")[0] ?? null;
    lang = countryToLang(profile?.country_code);
    const content = buildAdvertiserWelcome(firstName, lang);
    await enqueueWelcomeEmail(supabase, email, `advertiser-welcome${lang === "de" ? "-de" : ""}`, content, `welcome-adv-${userId}`);
  } else if (role === "vehicle_owner") {
    const { data: profile } = await supabase
      .from("owner_profiles")
      .select("full_name, country_code")
      .eq("user_id", userId)
      .maybeSingle();
    firstName = profile?.full_name?.split(" ")[0] ?? null;
    lang = countryToLang(profile?.country_code);
    const content = buildOwnerWelcome(firstName, lang);
    await enqueueWelcomeEmail(supabase, email, `owner-welcome${lang === "de" ? "-de" : ""}`, content, `welcome-own-${userId}`);
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
  const adDay3Start = new Date(now);
  adDay3Start.setDate(adDay3Start.getDate() - 4);
  const adDay3End = new Date(now);
  adDay3End.setDate(adDay3End.getDate() - 3);

  const { data: advertiserProfiles } = await supabase
    .from("advertiser_profiles")
    .select("user_id, full_name, created_at, country_code")
    .gte("created_at", adDay3Start.toISOString())
    .lt("created_at", adDay3End.toISOString());

  for (const profile of advertiserProfiles ?? []) {
    try {
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
      const lang = countryToLang(profile.country_code);
      const content = buildAdvertiserDay3(firstName, lang);
      const sent = await enqueueWelcomeEmail(
        supabase, email, `advertiser-welcome-day3${lang === "de" ? "-de" : ""}`, content,
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
  const owDay2Start = new Date(now);
  owDay2Start.setDate(owDay2Start.getDate() - 3);
  const owDay2End = new Date(now);
  owDay2End.setDate(owDay2End.getDate() - 2);

  const { data: ownerProfiles } = await supabase
    .from("owner_profiles")
    .select("user_id, full_name, created_at, stripe_connect_account_id, stripe_details_submitted, country_code")
    .gte("created_at", owDay2Start.toISOString())
    .lt("created_at", owDay2End.toISOString());

  for (const profile of ownerProfiles ?? []) {
    try {
      if (profile.stripe_connect_account_id && profile.stripe_details_submitted) {
        stats.skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) { stats.skipped++; continue; }

      const firstName = profile.full_name?.split(" ")[0] ?? null;
      const lang = countryToLang(profile.country_code);
      const content = buildOwnerDay2(firstName, lang);
      const sent = await enqueueWelcomeEmail(
        supabase, email, `owner-welcome-day2${lang === "de" ? "-de" : ""}`, content,
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

// ─── Activation batch (J+1 / J+7) ───────────────────────────────────────────

async function handleActivationBatch(supabase: ReturnType<typeof createClient>) {
  const now = new Date();
  const stats = { j1Sent: 0, j7Sent: 0, j7Notified: 0, skipped: 0, errors: 0 };

  // ── STEP 1 : J+1 — first nudge ─────────────────────────────────────────────
  // Target: registered between 48h and 24h ago, no brief yet, j1 not sent
  const j1Start = new Date(now);
  j1Start.setDate(j1Start.getDate() - 2);
  const j1End = new Date(now);
  j1End.setDate(j1End.getDate() - 1);

  const { data: j1Profiles } = await supabase
    .from("advertiser_profiles")
    .select("id, user_id, full_name, country_code, activation_j1_sent_at")
    .gte("created_at", j1Start.toISOString())
    .lt("created_at", j1End.toISOString())
    .is("activation_j1_sent_at", null);

  for (const profile of j1Profiles ?? []) {
    try {
      // Check no brief yet (advertiser_id = auth user_id)
      const { count } = await supabase
        .from("advertiser_briefs")
        .select("id", { count: "exact", head: true })
        .eq("advertiser_id", profile.user_id);

      if ((count ?? 0) > 0) {
        stats.skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) { stats.skipped++; continue; }

      const firstName = profile.full_name?.split(" ")[0] ?? null;
      const lang = countryToLang(profile.country_code);
      const content = buildAdvertiserDay1(firstName, lang);
      const sent = await enqueueWelcomeEmail(
        supabase, email,
        `advertiser-activation-j1${lang === "de" ? "-de" : ""}`,
        content,
        `activation-j1-${profile.user_id}`,
      );

      if (sent) {
        await supabase
          .from("advertiser_profiles")
          .update({ activation_j1_sent_at: now.toISOString() })
          .eq("id", profile.id);
        stats.j1Sent++;
      } else {
        stats.errors++;
      }
    } catch (err) {
      console.error(`[send-welcome-sequence] activation J+1 error for ${profile.user_id}:`, err);
      stats.errors++;
    }
  }

  // ── STEP 2 : J+7 — final nudge + in-app notification ──────────────────────
  // Target: registered between 8d and 7d ago, no brief yet, j7 not sent
  const j7Start = new Date(now);
  j7Start.setDate(j7Start.getDate() - 8);
  const j7End = new Date(now);
  j7End.setDate(j7End.getDate() - 7);

  const { data: j7Profiles } = await supabase
    .from("advertiser_profiles")
    .select("id, user_id, full_name, country_code, activation_j7_sent_at")
    .gte("created_at", j7Start.toISOString())
    .lt("created_at", j7End.toISOString())
    .is("activation_j7_sent_at", null);

  for (const profile of j7Profiles ?? []) {
    try {
      const { count } = await supabase
        .from("advertiser_briefs")
        .select("id", { count: "exact", head: true })
        .eq("advertiser_id", profile.user_id);

      if ((count ?? 0) > 0) {
        stats.skipped++;
        continue;
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
      const email = authUser?.user?.email;
      if (!email) { stats.skipped++; continue; }

      const firstName = profile.full_name?.split(" ")[0] ?? null;
      const lang = countryToLang(profile.country_code);
      const content = buildAdvertiserDay7(firstName, lang);
      const sent = await enqueueWelcomeEmail(
        supabase, email,
        `advertiser-activation-j7${lang === "de" ? "-de" : ""}`,
        content,
        `activation-j7-${profile.user_id}`,
      );

      if (sent) {
        await supabase
          .from("advertiser_profiles")
          .update({ activation_j7_sent_at: now.toISOString() })
          .eq("id", profile.id);
        stats.j7Sent++;

        // Insert in-app notification (read by useNotifications hook)
        const notifTitle = lang === "de"
          ? "Starten Sie noch heute Ihre erste Kampagne"
          : "Lancez votre première campagne aujourd'hui";
        const notifBody = lang === "de"
          ? "Ihr MoveSpot-Konto ist aktiv — erstellen Sie Ihr erstes Brief und erhalten Sie lokale Fahrzeugangebote."
          : "Votre espace annonceur est prêt. Créez un brief pour recevoir des propositions de flottes locales.";

        const { error: notifError } = await supabase
          .from("user_notifications")
          .insert({
            user_id: profile.user_id,
            kind: "activation_j7",
            title: notifTitle,
            body: notifBody,
            href: "/advertiser/briefs/nouveau",
          });

        if (!notifError) stats.j7Notified++;
        else console.error(`[send-welcome-sequence] user_notifications insert error for ${profile.user_id}:`, notifError);
      } else {
        stats.errors++;
      }
    } catch (err) {
      console.error(`[send-welcome-sequence] activation J+7 error for ${profile.user_id}:`, err);
      stats.errors++;
    }
  }

  console.log("[send-welcome-sequence] batch-activation done", stats);
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

  if (emailType === "batch-activation") {
    // Secured by INTERNAL_FUNCTION_SECRET (called by pg_cron SQL wrapper)
    const secret = req.headers.get("x-internal-secret");
    if (!INTERNAL_FUNCTION_SECRET || !secret || secret !== INTERNAL_FUNCTION_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    return await handleActivationBatch(supabase);
  }

  return new Response(JSON.stringify({ error: "invalid emailType" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
});
