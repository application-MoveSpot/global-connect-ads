import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const PartnerGenerateInput = z.object({
  partnerContext: z.string().min(10).max(600),
});

export type PartnerSuggestion = {
  description: string;
};

export type PartnerSuggestionResult =
  | { ok: true; suggestion: PartnerSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const generatePartnerSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof PartnerGenerateInput>) => PartnerGenerateInput.parse(d))
  .handler(async ({ data }): Promise<PartnerSuggestionResult> => {
    assertRateLimit(`partner-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
    if (!(await hasAuthenticatedBriefRequest())) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Session expirée — reconnectez-vous puis réessayez.",
      };
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
    const model = provider("google/gemini-2.5-flash");

    const prompt = `Tu es un expert en partenariats commerciaux pour la plateforme MoveSpot (publicité mobile sur véhicules en France).
Un partenaire potentiel (agence, réseau, revendeur, apporteur d'affaires) souhaite rejoindre la plateforme.
À partir de sa description, rédige une présentation professionnelle convaincante (3-5 phrases, 80-200 mots) qui explique :
- Son secteur d'activité et son positionnement
- Sa clientèle et ses points forts
- Ce qu'il apporte concrètement à MoveSpot (volume, réseau, expertise)
- Sa motivation à rejoindre le réseau

Contexte partenaire : ${data.partnerContext}

Réponds UNIQUEMENT en JSON strict :
{
  "description": "..."
}`;

    try {
      const { generateText } = await import("ai");
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.7,
        maxOutputTokens: 400,
      });
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as PartnerSuggestion;

      return {
        ok: true,
        suggestion: {
          description: String(parsed.description ?? "").slice(0, 1500),
        },
      };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "L'IA n'a pas pu générer de suggestion. Réessayez.",
      };
    }
  });
