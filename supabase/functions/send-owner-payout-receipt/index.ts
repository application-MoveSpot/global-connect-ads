import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const internalSecret = Deno.env.get("INTERNAL_FUNCTION_SECRET") ?? "";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
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
    const {
      request_id,
      email,
      amount_cents,
      currency = "EUR",
      reference,
      stripe_transfer_id,
      completed_at,
    } = await req.json();

    if (!email || amount_cents == null) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    const safeId         = escapeHtml(request_id);
    const safeRef        = escapeHtml(reference);
    const safeTransferId = escapeHtml(stripe_transfer_id);
    const safeAmt        = fmtEur(Number(amount_cents));
    const safeDate       = completed_at
      ? new Date(completed_at).toLocaleDateString("fr-FR", { dateStyle: "long" })
      : new Date().toLocaleDateString("fr-FR", { dateStyle: "long" });

    const data = await resend.emails.send({
      from:    "MoveSpot Virements <virements@move-spot.com>",
      to:      [email],
      subject: `Virement reçu — ${safeAmt}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#10b981;margin-top:0;">✅ Votre virement a bien été effectué</h2>
          <p>Bonjour,</p>
          <p>MoveSpot vient de vous virer vos gains directement sur votre compte bancaire lié à votre espace propriétaire.</p>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;padding:16px;border-radius:8px;margin:20px 0;">
            <h3 style="margin-top:0;font-size:13px;text-transform:uppercase;color:#065f46;">Détails du virement</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr>
                <td style="padding:4px 0;color:#6b7280;">Montant viré</td>
                <td style="padding:4px 0;text-align:right;font-weight:700;font-size:20px;color:#059669;">${safeAmt}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#6b7280;">Date</td>
                <td style="padding:4px 0;text-align:right;">${safeDate}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#6b7280;">Référence</td>
                <td style="padding:4px 0;text-align:right;font-family:monospace;font-size:12px;">${safeRef}</td>
              </tr>
              ${safeTransferId ? `
              <tr>
                <td style="padding:4px 0;color:#6b7280;">ID Stripe</td>
                <td style="padding:4px 0;text-align:right;font-family:monospace;font-size:12px;">${safeTransferId}</td>
              </tr>` : ""}
            </table>
          </div>

          <p style="font-size:13px;color:#6b7280;">
            Le virement apparaîtra sur votre relevé bancaire sous 1 à 3 jours ouvrés selon votre banque.
            Vous pouvez retrouver l'historique complet de vos virements dans votre espace propriétaire, section <strong>Portefeuille</strong>.
          </p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
          <p style="font-size:11px;color:#9ca3af;text-align:center;">
            MoveSpot SAS — virements@move-spot.com<br/>
            ID interne : ${safeId}
          </p>
        </div>
      `,
    });

    console.log(`Reçu virement envoyé à ${email} (ref: ${reference})`);
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error(`Erreur send-owner-payout-receipt: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
