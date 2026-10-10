import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  estimatePoseFee,
  inferFormatKey,
  validateInstallerQuote,
  detectZone,
  FORMAT_LABELS,
  ZONE_LABELS,
  type FormatKey,
  type PoseFeeRange,
} from "./pose-fee-estimate";

const EstimateInputSchema = z.object({
  vehicleId: z.string().uuid().optional(),
  vehicleType: z.string().optional(),
  surfaceM2: z.number().nullable().optional(),
  formatPublicitaire: z.string().nullable().optional(),
  location: z.string().max(200).optional(),
  useAi: z.boolean().default(false),
});

export type PoseFeeEstimateResult = {
  range: PoseFeeRange;
  formatLabel: string;
  zoneLabel: string;
  aiRecommendation?: string;
  source: "rules" | "rules+ai";
};

export const estimatePoseFeeForCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EstimateInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<PoseFeeEstimateResult> => {
    let vehicleType = data.vehicleType ?? "autre";
    let surfaceM2: number | null = data.surfaceM2 ?? null;
    let formatPub: string | null = data.formatPublicitaire ?? null;
    let location = data.location ?? "";

    // Fetch vehicle details if only id provided
    if (data.vehicleId && (!data.vehicleType || !data.location)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: vehicle } = await supabaseAdmin
        .from("vehicles")
        .select("type, surface_m2, format_publicitaire, zones, name")
        .eq("id", data.vehicleId)
        .maybeSingle();

      if (vehicle) {
        vehicleType    = (vehicle as { type: string }).type ?? vehicleType;
        surfaceM2      = (vehicle as { surface_m2: number | null }).surface_m2 ?? surfaceM2;
        formatPub      = (vehicle as { format_publicitaire: string | null }).format_publicitaire ?? formatPub;
        const zones    = (vehicle as { zones: string[] | null }).zones;
        if (!location && zones?.length) location = zones[0];
      }
    }

    const formatKey = inferFormatKey(surfaceM2, formatPub);
    const range = estimatePoseFee({ formatKey, vehicleType, location });

    let aiRecommendation: string | undefined;

    if (data.useAi) {
      try {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (apiKey) {
          const zone = detectZone(location);
          const prompt = `Tu es expert en tarification de pose/dépose d'adhésifs publicitaires sur véhicules en France.

Contexte de la mission :
- Type de véhicule : ${vehicleType}
- Format publicitaire : ${FORMAT_LABELS[formatKey]}
- Surface estimée : ${surfaceM2 ? `${surfaceM2} m²` : "non renseignée"}
- Zone géographique : ${ZONE_LABELS[zone]}
- Fourchette règles-métier : pose ${range.poseMin}–${range.poseMax} € / dépose ${range.deposeMin}–${range.deposeMax} €

Donne en 1–2 phrases : une validation ou un ajustement de cette fourchette selon le marché actuel (2026), et un conseil de négociation pour l'annonceur. Réponds en français, de façon concise et professionnelle.`;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
            }),
          });

          if (res.ok) {
            const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
            const text = json.choices?.[0]?.message?.content?.trim();
            if (text) aiRecommendation = text;
          }
        }
      } catch {
        // AI unavailable — rules-based result is still valid
      }
    }

    return {
      range,
      formatLabel: FORMAT_LABELS[formatKey],
      zoneLabel:   ZONE_LABELS[range.zone],
      aiRecommendation,
      source: aiRecommendation ? "rules+ai" : "rules",
    };
  });

/** Valide un devis poseur soumis par un prestataire. */
export const validateInstallerQuoteFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      quoteCents:    z.number().int().positive(),
      operation:     z.enum(["pose", "depose"]),
      vehicleType:   z.string(),
      surfaceM2:     z.number().nullable().optional(),
      formatPub:     z.string().nullable().optional(),
      location:      z.string().max(200),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const formatKey = inferFormatKey(data.surfaceM2 ?? null, data.formatPub ?? null);
    const range = estimatePoseFee({ formatKey, vehicleType: data.vehicleType, location: data.location });
    const result = validateInstallerQuote(data.quoteCents, range, data.operation);
    return { ...result, range, formatKey };
  });

/**
 * Calcule et stocke les frais poseur estimés (pose + dépose) dans la
 * campaign_request au moment de son acceptation.
 * Remplace la valeur plate de installer_fee_config par une valeur
 * contextualisée (format + véhicule + zone).
 */
export async function computeAndStorePoseFees(opts: {
  campaignRequestId: string;
  vehicleId: string;
  location: string;
}): Promise<{ poseFee: number; deposeFee: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: vehicle } = await supabaseAdmin
    .from("vehicles")
    .select("type, surface_m2, format_publicitaire")
    .eq("id", opts.vehicleId)
    .maybeSingle();

  const vehicleType = (vehicle as { type?: string } | null)?.type ?? "autre";
  const surfaceM2   = (vehicle as { surface_m2?: number | null } | null)?.surface_m2 ?? null;
  const formatPub   = (vehicle as { format_publicitaire?: string | null } | null)?.format_publicitaire ?? null;

  const formatKey = inferFormatKey(surfaceM2, formatPub);
  const range = estimatePoseFee({ formatKey, vehicleType, location: opts.location });

  // Use the midpoint of the range as the stored fee
  const poseFee   = Math.round((range.poseMin   + range.poseMax)   / 2) * 100; // in cents
  const deposeFee = Math.round((range.deposeMin + range.deposeMax) / 2) * 100;

  await supabaseAdmin
    .from("campaign_requests")
    .update({
      pose_fee_cents:   poseFee,
      depose_fee_cents: deposeFee,
    } as never)
    .eq("id", opts.campaignRequestId);

  return { poseFee, deposeFee };
}

// Re-export pure helpers for UI usage
export { estimatePoseFee, inferFormatKey, detectZone, validateInstallerQuote } from "./pose-fee-estimate";
export type { FormatKey, PoseFeeRange } from "./pose-fee-estimate";
