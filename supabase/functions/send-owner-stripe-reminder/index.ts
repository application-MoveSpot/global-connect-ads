import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "https://app.movespot.fr";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== internalSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { owner_id, email, full_name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "email requis" }), { status: 400 });
    }

    const safeName = escapeHtml(full_name ?? "Propriétaire");
    const onboardingUrl = `${APP_URL}/proprietaire/portefeuille?connect=refresh`;

    const data = await resend.emails.send({
      from: "MoveSpot <noreply@move-spot.com>",
      to: [email],
      subject: "⚠️ Finalisez votre compte Stripe pour recevoir vos paiements",
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#f59e0b;margin-top:0;">⚠️ Votre compte de paiement est incomplet</h2>
          <p>Bonjour ${safeName},</p>
          <p>
            Votre véhicule est actuellement associé à une campagne publicitaire active sur MoveSpot,
            mais votre compte Stripe Connect n'est pas encore entièrement configuré.
          </p>
          <p>
            <strong>Sans cette étape, vous ne pourrez pas recevoir vos virements.</strong>
          </p>

          <div style="background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:8px;margin:20px 0;">
            <h3 style="margin-top:0;font-size:13px;text-transform:uppercase;color:#92400e;">Que faire ?</h3>
            <ol style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;">
              <li>Connectez-vous à votre espace MoveSpot</li>
              <li>Accédez à l'onglet <strong>Portefeuille</strong></li>
              <li>Finalisez la configuration Stripe en quelques minutes</li>
            </ol>
          </div>

          <div style="text-align:center;margin:24px 0;">
            <a href="${onboardingUrl}"
               style="background:#f59e0b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px;display:inline-block;">
              Finaliser mon compte Stripe
            </a>
          </div>

          <p style="font-size:13px;color:#6b7280;">
            Cette démarche prend moins de 5 minutes. Si vous avez déjà finalisé votre compte
            et recevez ce message par erreur, ignorez-le simplement.
          </p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
          <p style="font-size:11px;color:#9ca3af;text-align:center;">
            MoveSpot — noreply@move-spot.com<br/>
            ID propriétaire : ${escapeHtml(owner_id)}
          </p>
        </div>
      `,
    });

    console.log(`Rappel Stripe Connect envoyé à ${email} (owner_id: ${owner_id})`);
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Erreur send-owner-stripe-reminder: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
