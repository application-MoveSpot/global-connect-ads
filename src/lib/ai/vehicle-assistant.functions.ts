import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const VehicleGenerateInput = z.object({
  ownerContext: z.string().min(10).max(600),
  vehicleType: z.string().optional(),
});

export type VehicleSuggestion = {
  name: string;
  description: string;
  surface_m2?: number;
  km_per_day?: number;
  zones?: string;
  price_per_day?: number;
};

export type VehicleSuggestionResult =
  | { ok: true; suggestion: VehicleSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const generateVehicleSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof VehicleGenerateInput>) => VehicleGenerateInput.parse(d))
  .handler(async ({ data }): Promise<VehicleSuggestionResult> => {
    assertRateLimit(`vehicle-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
    if (!(await hasAuthenticatedBriefRequest())) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Session expirée — reconnectez-vous puis réessayez.",
      };
    }

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "Le service IA est indisponible. Réessayez.",
      };
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    // gemini-2.5-flash is served by a reasoning model that burns most of the
    // output budget on reasoning tokens; flash-lite answers directly and is
    // the reliable fallback for short JSON (same pattern as the inscription
    // assistants).
    const FALLBACK_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    const typeLabel = data.vehicleType ? `Type de véhicule : ${data.vehicleType}.` : "";

    const prompt = `Tu es un expert en publicité extérieure mobile sur véhicules en France (plateforme MoveSpot).
Un propriétaire de véhicule veut l'inscrire sur la plateforme pour louer son espace publicitaire.
À partir de sa description, génère :
1. Un nom accrocheur pour l'annonce (max 60 caractères) — ex. "Van Paris 11e — 80 km/jour"
2. Une description commerciale (2-4 phrases, 80-200 mots) destinée aux annonceurs — points forts, zones de circulation, visibilité
3. Surface publicitaire disponible en m² (nombre décimal, optionnel — uniquement si clairement indiqué ou déductible du type)
4. Kilomètres par jour typiques (entier, optionnel — uniquement si mentionné)
5. Zones géographiques de circulation séparées par des virgules (villes, quartiers, arrondissements)
6. Prix indicatif par jour en euros entiers (optionnel — uniquement si le propriétaire mentionne ses attentes)

Contexte propriétaire : ${data.ownerContext}
${typeLabel}

Réponds UNIQUEMENT en JSON strict (surface_m2, km_per_day, zones et price_per_day sont optionnels) :
{
  "name": "...",
  "description": "...",
  "surface_m2": 2.5,
  "km_per_day": 80,
  "zones": "Paris, 11e arrondissement, Bastille",
  "price_per_day": 25
}`;

    const { generateText } = await import("ai");

    let parsed: VehicleSuggestion | undefined;
    let lastErr: unknown;
    for (const modelId of FALLBACK_MODELS) {
      try {
        const { text } = await generateText({
          model: provider(modelId),
          prompt,
          temperature: 0.7,
          // Reasoning models count reasoning tokens against this budget;
          // 600 left too little visible output and truncated the JSON.
          maxOutputTokens: 2000,
        });
        parsed = JSON.parse(extractJsonObject(text)) as VehicleSuggestion;
        break;
      } catch (err) {
        lastErr = err;
        captureServerException(err, { category: "ai", extra: { model: modelId } });
      }
    }

    if (parsed) {
      return {
        ok: true,
        suggestion: {
          name: String(parsed.name ?? "").slice(0, 80),
          description: String(parsed.description ?? "").slice(0, 500),
          surface_m2:
            typeof parsed.surface_m2 === "number" && parsed.surface_m2 > 0
              ? Math.round(parsed.surface_m2 * 10) / 10
              : undefined,
          km_per_day:
            typeof parsed.km_per_day === "number" && parsed.km_per_day > 0
              ? Math.round(parsed.km_per_day)
              : undefined,
          zones: parsed.zones ? String(parsed.zones).slice(0, 200) : undefined,
          price_per_day:
            typeof parsed.price_per_day === "number" && parsed.price_per_day > 0
              ? Math.round(parsed.price_per_day)
              : undefined,
        },
      };
    }

    captureServerException(lastErr, { category: "ai", extra: { note: "all models failed" } });
    return {
      ok: false,
      code: "AI_UNAVAILABLE",
      message: "L'IA n'a pas pu générer de suggestion. Réessayez.",
    };
  });
