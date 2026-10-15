import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const OwnerInscriptionInput = z.object({
  ownerContext: z.string().min(10).max(600),
  _auth: z.string().optional(),
});

export type OwnerInscriptionSuggestion = {
  fullName?: string;
  city?: string;
  bio?: string;
};

export type OwnerInscriptionResult =
  | { ok: true; suggestion: OwnerInscriptionSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

const CITY_MAX = 100;
const NAME_MAX = 120;
const BIO_MAX = 300;

export const generateOwnerInscriptionSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof OwnerInscriptionInput>) => OwnerInscriptionInput.parse(d))
  .handler(async ({ data }): Promise<OwnerInscriptionResult> => {
    assertRateLimit(`owner-inscription-suggest:${getRequestIp()}`, {
      maxRequests: 10,
      windowMs: 60_000,
    });
    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok) {
      const message =
        auth.reason === "token_expired"
          ? "Votre session a expiré — rechargez la page ou reconnectez-vous."
          : auth.reason === "no_token"
            ? "Vous devez être connecté pour utiliser l'assistant IA."
            : auth.reason === "config_missing"
              ? "Le service IA est temporairement indisponible. Réessayez."
              : "Session invalide — reconnectez-vous puis réessayez.";
      const code = auth.reason === "config_missing" ? "AI_UNAVAILABLE" : "UNAUTHORIZED";
      return { ok: false, code, message };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "Le service IA est indisponible. Réessayez.",
      };
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    const FALLBACK_MODELS = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    const prompt = `Tu es un assistant pour la plateforme MoveSpot (publicité mobile sur véhicules en France).
Un propriétaire de véhicule s'inscrit sur la plateforme. À partir de sa description, déduis :
1. Son nom complet (prénom et nom) — uniquement si clairement mentionné
2. Sa ville principale (nom de ville uniquement, sans département ni pays)
3. Une courte bio professionnelle (2-3 phrases max, ${BIO_MAX} caractères max) valorisant son sérieux, son véhicule ou sa zone de circulation — si tu as assez d'informations

Contexte : ${data.ownerContext}

Réponds UNIQUEMENT en JSON strict (toutes les clés sont optionnelles, n'inclus que celles que tu peux déduire avec confiance) :
{
  "fullName": "Marie Dupont",
  "city": "Marseille",
  "bio": "Chauffeur VTC professionnel depuis 5 ans, je circule principalement dans le 1er et 2e arrondissement de Marseille. Disponible 6j/7, je garantis visibilité et sérieux."
}`;

    const { generateText } = await import("ai");
    let lastErr: unknown;
    for (const modelId of FALLBACK_MODELS) {
      try {
        const { text } = await generateText({
          model: provider(modelId),
          prompt,
          temperature: 0.35,
          maxOutputTokens: 1000,
        });
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const raw = fence ? fence[1] : text;
        const parsed = JSON.parse(raw.trim()) as OwnerInscriptionSuggestion;

        const suggestion: OwnerInscriptionSuggestion = {};
        if (typeof parsed.fullName === "string" && parsed.fullName.trim())
          suggestion.fullName = String(parsed.fullName).trim().slice(0, NAME_MAX);
        if (typeof parsed.city === "string" && parsed.city.trim())
          suggestion.city = String(parsed.city).trim().slice(0, CITY_MAX);
        if (typeof parsed.bio === "string" && parsed.bio.trim())
          suggestion.bio = String(parsed.bio).trim().slice(0, BIO_MAX);

        return { ok: true, suggestion };
      } catch (err) {
        lastErr = err;
        captureServerException(err, { category: "ai", extra: { model: modelId } });
      }
    }

    captureServerException(lastErr, { category: "ai", extra: { note: "all models failed" } });
    return {
      ok: false,
      code: "AI_UNAVAILABLE",
      message: "L'IA n'a pas pu générer de suggestion. Réessayez.",
    };
  });
