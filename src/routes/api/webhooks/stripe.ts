/**
 * Webhook Stripe — Reversements propriétaires + Vigilance Urssaf
 *
 * À activer dans le dashboard Stripe → Developers → Webhooks :
 *   URL : https://<votre-domaine>/api/webhooks/stripe
 *   Événements à écouter :
 *     - transfer.created
 *
 * Variable d'environnement requise : STRIPE_VIGILANCE_WEBHOOK_SECRET
 * (fallback sur STRIPE_WEBHOOK_SECRET si absent, pour compatibilité)
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { VIGILANCE_SEUIL_CENTIMES } from "@/lib/payments/vigilance.functions";

/** Vérifie la signature Stripe HMAC-SHA256 avec le secret dédié au webhook vigilance. */
async function verifyVigilanceWebhook(
  req: Request,
): Promise<{ id: string; type: string; data: { object: unknown } }> {
  const secret =
    process.env["STRIPE_VIGILANCE_WEBHOOK_SECRET"] ??
    process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) throw new Error("STRIPE_VIGILANCE_WEBHOOK_SECRET non configuré");

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature || !body) throw new Error("Signature ou body manquant");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Format de signature invalide");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Signature expirée");

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");
  if (!v1Signatures.includes(expected)) throw new Error("Signature invalide");

  return JSON.parse(body);
}

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // ─── 1. Vérification de la signature Stripe ─────────────────────────
        let event: { id: string; type: string; data: { object: unknown } };
        try {
          event = await verifyVigilanceWebhook(request);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Signature invalide";
          return new Response(msg, { status: 400 });
        }

        const db = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        );

        try {
          // ─── 2. Événement : transfer.created ────────────────────────────────
          if (event.type === "transfer.created") {
            const transfer = event.data.object as {
              id: string;
              amount: number; // centimes
              destination: string; // stripe_account_id du propriétaire
              metadata?: Record<string, string>;
            };

            // Retrouver le propriétaire via son stripe_account_id
            const { data: ownerProfile } = await db
              .from("owner_profiles" as never)
              .select(
                "id, user_id, vigilance_statut, vigilance_gains_cumules_centimes, vigilance_seuil_atteint_at",
              )
              .eq("stripe_account_id" as never, transfer.destination)
              .maybeSingle();

            if (!ownerProfile) {
              // Pas un propriétaire MoveSpot (compte Stripe externe) — on ignore
              return new Response("ignored", { status: 200 });
            }

            const owner = ownerProfile as {
              id: string;
              user_id: string;
              vigilance_statut: string;
              vigilance_gains_cumules_centimes: number;
              vigilance_seuil_atteint_at: string | null;
            };

            const anciensCumul = Number(owner.vigilance_gains_cumules_centimes ?? 0);
            const nouveauCumul = anciensCumul + transfer.amount;
            const seuilAtteintPourPremiereFois =
              anciensCumul < VIGILANCE_SEUIL_CENTIMES && nouveauCumul >= VIGILANCE_SEUIL_CENTIMES;

            // ─── 3. Mise à jour du cumul des gains ──────────────────────────
            const miseAJour: Record<string, unknown> = {
              vigilance_gains_cumules_centimes: nouveauCumul,
            };

            // Enregistrer l'horodatage du premier dépassement de seuil
            if (seuilAtteintPourPremiereFois) {
              miseAJour.vigilance_seuil_atteint_at = new Date().toISOString();
            }

            // ─── 4. Blocage automatique si seuil dépassé et non VALIDE ────────
            // Le statut passe à BLOQUE uniquement si le seuil vient d'être
            // franchi (pas de double-blocage si déjà BLOQUE).
            if (
              seuilAtteintPourPremiereFois &&
              owner.vigilance_statut !== "VALIDE" &&
              owner.vigilance_statut !== "BLOQUE"
            ) {
              miseAJour.vigilance_statut = "BLOQUE";

              // Notifier le propriétaire (best-effort)
              try {
                const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");
                await sendWebPushToUser(owner.user_id, {
                  title: "⚠️ Action requise — Attestation Urssaf",
                  body: "Vous avez dépassé 5 000 € de gains. Fournissez votre attestation Urssaf pour débloquer vos virements.",
                  url: "/owner",
                });
              } catch {
                // Pas d'impact sur la réponse webhook
              }
            }

            await db
              .from("owner_profiles" as never)
              .update(miseAJour as never)
              .eq("id" as never, owner.id);
          }
        } catch (err) {
          // On log l'erreur mais on répond 200 pour éviter que Stripe rejoue indéfiniment
          console.error("[webhook/stripe]", err);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
