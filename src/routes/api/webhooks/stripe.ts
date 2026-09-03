/**
 * Webhook Stripe — Reversements propriétaires + Vigilance Urssaf
 *
 * À activer dans le dashboard Stripe → Developers → Webhooks :
 *   URL : https://<votre-domaine>/api/webhooks/stripe
 *   Événements à écouter :
 *     - transfer.created
 *
 * Variable d'environnement requise : STRIPE_WEBHOOK_SECRET
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook } from "@/lib/payments/stripe.server";
import { VIGILANCE_SEUIL_CENTIMES } from "@/lib/payments/vigilance.functions";

export const Route = createFileRoute("/api/webhooks/stripe")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // ─── 1. Vérification de la signature Stripe ─────────────────────────
        let event: { id: string; type: string; data: { object: unknown } };
        try {
          event = await verifyWebhook(request);
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
              amount: number;          // centimes
              destination: string;     // stripe_account_id du propriétaire
              metadata?: Record<string, string>;
            };

            // Retrouver le propriétaire via son stripe_account_id
            const { data: ownerProfile } = await db
              .from("owner_profiles" as never)
              .select("id, user_id, vigilance_statut, vigilance_gains_cumules_centimes, vigilance_seuil_atteint_at")
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
              anciensCumul < VIGILANCE_SEUIL_CENTIMES &&
              nouveauCumul >= VIGILANCE_SEUIL_CENTIMES;

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
                const { sendWebPushToUser } = await import(
                  "@/lib/notifications/push-send.server"
                );
                await sendWebPushToUser(owner.user_id, {
                  title: "⚠️ Action requise — Attestation Urssaf",
                  body: "Vous avez dépassé 5 000 € de gains. Fournissez votre attestation Urssaf pour débloquer vos virements.",
                  url: "/proprietaire",
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
