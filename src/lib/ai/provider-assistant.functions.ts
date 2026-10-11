import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const ProviderGenerateInput = z.object({
  providerContext: z.string().min(10).max(600),
});

export type ProviderSuggestion = {
  description: string;
  coverageAreas: string[];
  services: string[];
};

export type ProviderSuggestionResult =
  | { ok: true; suggestion: ProviderSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

const VALID_SERVICES = new Set(["covering_vehicule", "video_publicitaire", "creation_graphique"]);

export const generateProviderSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof ProviderGenerateInput>) => ProviderGenerateInput.parse(d))
  .handler(async ({ data }): Promise<ProviderSuggestionResult> => {
    assertRateLimit(`provider-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
    if (!(await hasAuthenticatedBriefRequest())) {
      return { ok: false, code: "UNAUTHORIZED", message: "Session expirée — reconnectez-vous puis réessayez." };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, code: "AI_UNAVAILABLE", message: "Le service IA est indisponible. Réessayez." };
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const SERVICES_LIST = "covering_vehicule, video_publicitaire, creation_graphique";

    const prompt = `Tu es un expert en prestation pour la publicité mobile sur véhicules en France (plateforme MoveSpot).
Un prestataire (poseur / graphiste / vidéaste) veut créer son profil professionnel.
À partir de sa description, génère :
1. Une description professionnelle convaincante (3-5 phrases, 120-300 mots) — expertise, équipements, types de projets, délais, points forts
2. Les zones géographiques d'intervention (tableau de villes/départements/régions, 1 à 10 valeurs)
3. Les services proposés parmi : ${SERVICES_LIST} (1 à 3 valeurs correspondant exactement à ces clés)

Contexte prestataire : ${data.providerContext}

Réponds UNIQUEMENT en JSON strict :
{
  "description": "...",
  "coverageAreas": ["Paris", "Île-de-France"],
  "services": ["covering_vehicule"]
}`;

    try {
      const { generateText } = await import("ai");
      const { text } = await generateText({ model, prompt, temperature: 0.7, maxOutputTokens: 700 });
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as ProviderSuggestion;

      const coverageAreas = Array.isArray(parsed.coverageAreas)
        ? parsed.coverageAreas.filter((z) => typeof z === "string" && z.trim()).slice(0, 10).map((z) => String(z).trim())
        : [];
      const services = Array.isArray(parsed.services)
        ? parsed.services.filter((s) => typeof s === "string" && VALID_SERVICES.has(s)).slice(0, 3)
        : [];

      return {
        ok: true,
        suggestion: {
          description: String(parsed.description ?? "").slice(0, 1500),
          coverageAreas,
          services,
        },
      };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return { ok: false, code: "AI_UNAVAILABLE", message: "L'IA n'a pas pu générer de suggestion. Réessayez." };
    }
  });
