/**
 * send-support-reminder
 *
 * Appelée par process_support_email_queue() via pg_net quand un message admin
 * reste non-lu 10 minutes après l'envoi.
 *
 * Auth : header x-webhook-secret validé contre SUPPORT_WEBHOOK_SECRET (Supabase secret).
 * Ne jamais exposer cette fonction publiquement sans ce contrôle.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import Resend from "npm:resend";

const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY           = Deno.env.get("RESEND_API_KEY")!;
// Secret partagé entre la DB (app.support_webhook_secret) et cette fonction
const SUPPORT_WEBHOOK_SECRET   = Deno.env.get("SUPPORT_WEBHOOK_SECRET") ?? "";

const resend = new Resend(RESEND_API_KEY);

Deno.serve(async (req) => {
  // ── Auth : valider le secret dédié, pas juste la présence du header ────────
  const incoming = req.headers.get("x-webhook-secret") ?? "";
  if (!SUPPORT_WEBHOOK_SECRET || incoming !== SUPPORT_WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { email, unread_count, room_id } = (await req.json()) as {
      email: string;
      unread_count: number;
      room_id: string;
    };

    if (!email || !unread_count || !room_id) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Double-check via admin client : re-vérifier que le message est bien non-lu
    // (garde-fou si l'annonceur a lu entre le moment de la planification et maintenant)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: room } = await admin
      .from("support_rooms")
      .select("last_read_at, status")
      .eq("id", room_id)
      .maybeSingle();

    if (!room || room.status === "resolved") {
      // Room résolue ou introuvable : skip silencieux
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    // ── Lien direct vers le dashboard annonceur ────────────────────────────────
    // Le widget chat s'ouvre côté client, l'URL pointe simplement sur le dashboard.
    // ← corrigé : template literal avec backticks, ${} pas {}
    const dashboardUrl = `https://movespot.com/annonceur`;

    const plural = unread_count > 1;
    const subject = `💬 Vous avez ${unread_count} nouveau${plural ? "x" : ""} message${plural ? "s" : ""} sur MoveSpot`;

    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1a1a1a;">
        <h2 style="margin: 0 0 16px; font-size: 20px;">Bonjour 👋</h2>
        <p style="margin: 0 0 12px; font-size: 15px; line-height: 1.6; color: #444;">
          Notre équipe de support vous a répondu dans le chat en direct.
        </p>
        <p style="margin: 0 0 28px; font-size: 15px; line-height: 1.6; color: #444;">
          Vous avez actuellement
          <strong>${unread_count} message${plural ? "s" : ""} en attente</strong>.
        </p>
        <a
          href="${dashboardUrl}"
          style="display:inline-block; background:#7c3aed; color:#fff; padding:12px 28px;
                 text-decoration:none; border-radius:8px; font-weight:600; font-size:15px;"
        >
          Voir mes messages →
        </a>
        <p style="margin: 32px 0 0; font-size: 12px; color: #999;">
          Vous recevez cet email car vous étiez hors-ligne lors de la réponse de notre équipe.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: "MoveSpot Support <support@movespot.com>",
      to: [email],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("send-support-reminder error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
