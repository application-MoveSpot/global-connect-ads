import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const { transaction_id, email, amount, description } = await req.json();

    if (!email || amount == null) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400 });
    }

    const safeId   = escapeHtml(transaction_id);
    const safeDesc = escapeHtml(description);
    const safeAmt  = Number(amount).toFixed(2);

    const data = await resend.emails.send({
      from:    "MoveSpot Support <support@move-spot.com>",
      to:      [email],
      subject: `Reçu de paiement MoveSpot — ${safeAmt} €`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;border:1px solid #eee;border-radius:8px;">
          <h2 style="color:#7c3aed;">Merci pour votre confiance !</h2>
          <p>Votre portefeuille MoveSpot a été débité pour le paiement de votre campagne publicitaire.</p>

          <div style="background-color:#f9fafb;padding:15px;border-radius:6px;margin:20px 0;">
            <h3 style="margin-top:0;font-size:14px;text-transform:uppercase;color:#666;">Détails de la transaction</h3>
            <p style="margin:5px 0;"><strong>ID de transaction :</strong> ${safeId}</p>
            <p style="margin:5px 0;"><strong>Description :</strong> ${safeDesc}</p>
            <p style="margin:5px 0;font-size:18px;color:#111;"><strong>Montant débité :</strong> ${safeAmt} €</p>
          </div>

          <p style="font-size:12px;color:#666;">
            Pour toute question concernant cette facture, contactez notre équipe via le chat support de votre espace annonceur.
          </p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
          <p style="font-size:11px;color:#999;text-align:center;">MoveSpot SAS — support@move-spot.com</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
