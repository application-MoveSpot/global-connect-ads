/**
 * Obligation de vigilance Urssaf (Art. L.8222-1 Code du travail)
 * Dès qu'un propriétaire dépasse 5 000 € HT de gains cumulés sur la plateforme,
 * MoveSpot est tenu de vérifier son attestation de vigilance Urssaf.
 * Tant que le statut n'est pas VALIDE, les virements Stripe sont bloqués.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VigilanceStatut = "EN_ATTENTE" | "VALIDE" | "BLOQUE";

/** Seuil légal : 5 000 € HT en centimes */
export const VIGILANCE_SEUIL_CENTIMES = 5_000_00;

// ─── Propriétaire : lire son statut de vigilance ───────────────────────────

export const getMyVigilanceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("owner_profiles")
      .select(
        "vigilance_statut, vigilance_gains_cumules_centimes, vigilance_date_verification, vigilance_seuil_atteint_at, vigilance_attestation_url",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) return null;

    const gains = Number(
      (data as Record<string, unknown>).vigilance_gains_cumules_centimes ?? 0,
    );
    const statut = (
      (data as Record<string, unknown>).vigilance_statut ?? "EN_ATTENTE"
    ) as VigilanceStatut;

    return {
      statut,
      gainsCentimes: gains,
      gainsEuros: gains / 100,
      seuilAtteint: gains >= VIGILANCE_SEUIL_CENTIMES,
      dateVerification: (data as Record<string, unknown>)
        .vigilance_date_verification as string | null,
      seuilAtteintAt: (data as Record<string, unknown>)
        .vigilance_seuil_atteint_at as string | null,
      attestationUrl: (data as Record<string, unknown>)
        .vigilance_attestation_url as string | null,
    };
  });

// ─── Propriétaire : soumettre le chemin de l'attestation uploadée ────────────

const SubmitAttestationInput = z.object({
  // Chemin Supabase Storage retourné après l'upload côté client
  storagePath: z.string().min(5).max(500),
});

export const submitAttestationUrssaf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof SubmitAttestationInput>) =>
    SubmitAttestationInput.parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Sécurité : le chemin doit appartenir à l'utilisateur connecté
    if (!data.storagePath.startsWith(`${userId}/`)) {
      throw new Error("Chemin de fichier invalide");
    }

    const { error } = await supabase
      .from("owner_profiles")
      .update({
        vigilance_attestation_url: data.storagePath,
        // On reste BLOQUE jusqu'à validation manuelle par l'admin
        vigilance_notes: null,
      } as never)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);

    // Notifier les admins (best-effort)
    try {
      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const { data: admins } = await supabaseAdmin
        .from("user_roles" as never)
        .select("user_id")
        .eq("role" as never, "admin");

      if (admins?.length) {
        const { sendWebPushToUser } = await import(
          "@/lib/notifications/push-send.server"
        );
        await Promise.allSettled(
          (admins as Array<{ user_id: string }>).map((a) =>
            sendWebPushToUser(a.user_id, {
              title: "Attestation Urssaf à valider",
              body: "Un propriétaire a soumis son attestation de vigilance.",
              url: "/admin",
            }),
          ),
        );
      }
    } catch {
      // Ne jamais bloquer la réponse sur une erreur de notification
    }

    return { ok: true };
  });

// ─── Admin : valider ou rejeter une attestation ───────────────────────────────

const ReviewVigilanceInput = z.object({
  ownerUserId: z.string().uuid(),
  decision: z.enum(["VALIDE", "BLOQUE"]),
  notes: z.string().max(500).optional(),
});

export const reviewVigilance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ReviewVigilanceInput>) =>
    ReviewVigilanceInput.parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Vérifier le rôle admin
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("owner_profiles")
      .update({
        vigilance_statut: data.decision,
        vigilance_date_verification: new Date().toISOString(),
        vigilance_notes: data.notes ?? null,
      } as never)
      .eq("user_id", data.ownerUserId);

    if (error) throw new Error(error.message);

    // Notifier le propriétaire (best-effort)
    try {
      const { sendWebPushToUser } = await import(
        "@/lib/notifications/push-send.server"
      );
      await sendWebPushToUser(data.ownerUserId, {
        title:
          data.decision === "VALIDE"
            ? "✅ Attestation validée — virements débloqués"
            : "⛔ Attestation refusée — action requise",
        body:
          data.decision === "VALIDE"
            ? "Votre attestation Urssaf a été validée. Vos prochains reversements sont débloqués."
            : data.notes ?? "Veuillez soumettre une nouvelle attestation.",
        url: "/proprietaire",
      });
    } catch {
      // Ne jamais bloquer sur notification
    }

    return { ok: true };
  });
