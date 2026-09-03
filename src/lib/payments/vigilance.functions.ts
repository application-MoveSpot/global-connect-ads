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

// ─── Admin : lister les attestations en attente de vérification ──────────────

export type VigilancePendingRow = {
  id: string;
  user_id: string;
  full_name: string | null;
  gains_centimes: number;
  statut: VigilanceStatut;
  attestation_url: string | null;
  seuil_atteint_at: string | null;
  date_verification: string | null;
  notes: string | null;
};

export const adminListVigilancePending = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data, error } = await supabaseAdmin
      .from("owner_profiles")
      .select(
        "id, user_id, full_name, vigilance_statut, vigilance_gains_cumules_centimes, vigilance_attestation_url, vigilance_seuil_atteint_at, vigilance_date_verification, vigilance_notes",
      )
      .not("vigilance_attestation_url" as never, "is", null)
      .order("vigilance_seuil_atteint_at" as never, { ascending: true });

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => {
      const r = row as unknown as Record<string, unknown>;
      return {
        id: r.id as string,
        user_id: r.user_id as string,
        full_name: (r.full_name as string | null) ?? null,
        gains_centimes: Number(r.vigilance_gains_cumules_centimes ?? 0),
        statut: (r.vigilance_statut ?? "EN_ATTENTE") as VigilanceStatut,
        attestation_url: (r.vigilance_attestation_url as string | null) ?? null,
        seuil_atteint_at: (r.vigilance_seuil_atteint_at as string | null) ?? null,
        date_verification: (r.vigilance_date_verification as string | null) ?? null,
        notes: (r.vigilance_notes as string | null) ?? null,
      } satisfies VigilancePendingRow;
    });
  });

// ─── Admin : générer une URL signée pour voir l'attestation ──────────────────

export const adminGetAttestationUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ storagePath: z.string().min(5) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const { data: signed, error } = await supabaseAdmin.storage
      .from("attestations-urssaf")
      .createSignedUrl(data.storagePath, 300); // 5 min

    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

// ─── Admin : analyser une attestation avec l'IA (vision + auto-rejet) ─────────

export type AttestationAnalyse = {
  verdict: "authentique" | "suspect" | "fraude" | "illisible" | "expire";
  score_fraude: number; // 0–100
  lisible: boolean;
  expire: boolean;
  siret: string | null;
  date_validite: string | null;
  motifs: string[];
  auto_rejete: boolean;
};

export const adminAnalyseAttestation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ ownerProfileId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Admin requis");

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // 1. Récupérer le profil et le chemin de l'attestation
    const { data: profileRaw, error: profileError } = await supabaseAdmin
      .from("owner_profiles")
      .select("id, user_id, vigilance_attestation_url, vigilance_statut")
      .eq("id" as never, data.ownerProfileId)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profileRaw) throw new Error("Profil introuvable");

    const profile = profileRaw as unknown as Record<string, unknown>;
    const storagePath = profile.vigilance_attestation_url as string | null;
    if (!storagePath) throw new Error("Aucune attestation soumise");

    // 2. URL signée pour télécharger le fichier (pour l'IA)
    const { data: signed } = await supabaseAdmin.storage
      .from("attestations-urssaf")
      .createSignedUrl(storagePath, 120);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const isPdf = storagePath.toLowerCase().endsWith(".pdf");
    const ext = storagePath.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const mime = mimeMap[ext] ?? "image/jpeg";

    const systemPrompt = `Tu es un expert en fraude documentaire spécialisé dans les attestations de vigilance Urssaf françaises.

IMPORTANT — critères de REJET AUTOMATIQUE (score_fraude >= 85 OU lisible = false OU expire = true) :
- Document flou, illisible, partiellement masqué, très basse résolution → lisible: false
- Document clairement pas une attestation Urssaf (facture, autre document) → score_fraude: 95+
- Signes de retouche : texte incohérent, polices mélangées, pixellisation suspecte → score_fraude: 85+
- Date de validité dépassée depuis plus de 6 mois depuis aujourd'hui (${new Date().toISOString().slice(0, 10)}) → expire: true
- QR code absent sur un document récent (post-2020) → score_fraude += 20

Réponds UNIQUEMENT en JSON strict :
{
  "verdict": "authentique" | "suspect" | "fraude" | "illisible" | "expire",
  "score_fraude": number (0-100),
  "lisible": boolean,
  "expire": boolean,
  "siret": "numéro SIRET extrait ou null",
  "date_validite": "date ISO extraite ou null",
  "motifs": ["raison 1 en français", "raison 2"...]
}`;

    const contentParts: Array<Record<string, unknown>> = [
      { type: "text", text: systemPrompt },
    ];

    if (!isPdf && signed?.signedUrl) {
      contentParts.push({ type: "image_url", image_url: { url: signed.signedUrl } });
    } else {
      contentParts.push({
        type: "text",
        text: isPdf
          ? "Le document est un PDF — analyse basée sur les métadonnées et le contexte."
          : "Document non disponible pour l'analyse visuelle.",
      });
    }

    let parsed: Partial<AttestationAnalyse> = {};

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: contentParts }],
          response_format: { type: "json_object" },
          temperature: 0,
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const raw = json.choices?.[0]?.message?.content ?? "{}";
        try { parsed = JSON.parse(raw); } catch { /* ignore */ }
      }
    } catch {
      // L'analyse IA a échoué — on retourne suspect par défaut
    }

    const verdict = (parsed.verdict ?? "suspect") as AttestationAnalyse["verdict"];
    const scoreFraude = Number(parsed.score_fraude ?? 50);
    const lisible = parsed.lisible !== false;
    const expire = parsed.expire === true;
    const motifs = Array.isArray(parsed.motifs) ? (parsed.motifs as string[]) : [];

    // 3. Rejet automatique si fraude/illisible/expiré
    const autoRejete = !lisible || expire || scoreFraude >= 85;

    if (autoRejete) {
      const raisonRejet = !lisible
        ? "Document illisible ou flouté — impossible à vérifier."
        : expire
          ? "Attestation expirée — veuillez en fournir une valide (< 6 mois)."
          : `Fraude probable détectée par l'IA (score ${scoreFraude}/100). Motifs : ${motifs.join("; ")}.`;

      await supabaseAdmin
        .from("owner_profiles")
        .update({
          vigilance_statut: "BLOQUE",
          vigilance_attestation_url: null, // force re-soumission
          vigilance_notes: raisonRejet,
        } as never)
        .eq("id" as never, data.ownerProfileId);

      // Notifier le propriétaire
      try {
        const { sendWebPushToUser } = await import(
          "@/lib/notifications/push-send.server"
        );
        await sendWebPushToUser(profile.user_id as string, {
          title: "⛔ Attestation refusée automatiquement",
          body: raisonRejet,
          url: "/proprietaire",
        });
      } catch { /* best-effort */ }
    }

    return {
      verdict,
      score_fraude: scoreFraude,
      lisible,
      expire,
      siret: (parsed.siret as string | null) ?? null,
      date_validite: (parsed.date_validite as string | null) ?? null,
      motifs,
      auto_rejete: autoRejete,
    } satisfies AttestationAnalyse;
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
