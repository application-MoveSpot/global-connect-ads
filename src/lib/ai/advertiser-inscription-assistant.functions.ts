import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const AdvertiserInscriptionInput = z.object({
  advertiserContext: z.string().min(10).max(600),
});

export type AdvertiserInscriptionSuggestion = {
  fullName?: string;
  company?: string;
  city?: string;
};

export type AdvertiserInscriptionResult =
  | { ok: true; suggestion: AdvertiserInscriptionSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

const CITY_MAX = 100;
const NAME_MAX = 120;

export const generateAdvertiserInscriptionSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof AdvertiserInscriptionInput>) => AdvertiserInscriptionInput.parse(d))
  .handler(async ({ data }): Promise<AdvertiserInscriptionResult> => {
    assertRateLimit(`advertiser-inscription-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
    if (!(await hasAuthenticatedBriefRequest())) {
      return { ok: false, code: "UNAUTHORIZED", message: "Session expirée — reconnectez-vous puis réessayez." };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, code: "AI_UNAVAILABLE", message: "Le service IA est indisponible. Réessayez." };
    }

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const prompt = `Tu es un assistant pour la plateforme MoveSpot (publicité mobile sur véhicules en France).
Un annonceur s'inscrit sur la plateforme. À partir de sa description, déduis :
1. Son nom complet (prénom et nom) — uniquement si clairement mentionné
2. Le nom de son entreprise ou raison sociale — uniquement si clairement mentionné
3. Sa ville principale (nom de ville uniquement, sans département ni pays)

Contexte : ${data.advertiserContext}

Réponds UNIQUEMENT en JSON strict (toutes les clés sont optionnelles, n'inclus que celles que tu peux déduire avec confiance) :
{
  "fullName": "Jean Dupont",
  "company": "Boulangerie Martin",
  "city": "Lyon"
}`;

    try {
      const { generateText } = await import("ai");
      const { text } = await generateText({ model, prompt, temperature: 0.3, maxOutputTokens: 200 });
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as AdvertiserInscriptionSuggestion;

      const suggestion: AdvertiserInscriptionSuggestion = {};
      if (typeof parsed.fullName === "string" && parsed.fullName.trim())
        suggestion.fullName = String(parsed.fullName).trim().slice(0, NAME_MAX);
      if (typeof parsed.company === "string" && parsed.company.trim())
        suggestion.company = String(parsed.company).trim().slice(0, NAME_MAX);
      if (typeof parsed.city === "string" && parsed.city.trim())
        suggestion.city = String(parsed.city).trim().slice(0, CITY_MAX);

      return { ok: true, suggestion };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return { ok: false, code: "AI_UNAVAILABLE", message: "L'IA n'a pas pu générer de suggestion. Réessayez." };
    }
  });
