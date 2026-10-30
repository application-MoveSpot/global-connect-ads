import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const Input = z.object({
  sector: z.enum([
    "retail",
    "restauration",
    "immobilier",
    "tech",
    "evenementiel",
    "sante",
    "autre",
  ]),
  city: z.enum(["paris", "lyon", "marseille", "bordeaux", "toulouse", "nantes", "lille"]),
  monthlyBudget: z.number().min(100).max(10_000),
});

type EstimateOutput = { relevanceScore: number; insight: string };

// Sector × city affinity matrix (0–1)
const AFFINITY: Record<string, Record<string, number>> = {
  retail: {
    paris: 0.95,
    lyon: 0.85,
    marseille: 0.82,
    bordeaux: 0.78,
    toulouse: 0.77,
    nantes: 0.75,
    lille: 0.76,
  },
  restauration: {
    paris: 0.88,
    lyon: 0.9,
    marseille: 0.85,
    bordeaux: 0.82,
    toulouse: 0.8,
    nantes: 0.78,
    lille: 0.77,
  },
  immobilier: {
    paris: 0.82,
    lyon: 0.75,
    marseille: 0.7,
    bordeaux: 0.78,
    toulouse: 0.72,
    nantes: 0.74,
    lille: 0.68,
  },
  tech: {
    paris: 0.9,
    lyon: 0.8,
    marseille: 0.65,
    bordeaux: 0.7,
    toulouse: 0.75,
    nantes: 0.72,
    lille: 0.68,
  },
  evenementiel: {
    paris: 0.92,
    lyon: 0.82,
    marseille: 0.78,
    bordeaux: 0.8,
    toulouse: 0.78,
    nantes: 0.76,
    lille: 0.74,
  },
  sante: {
    paris: 0.78,
    lyon: 0.72,
    marseille: 0.7,
    bordeaux: 0.7,
    toulouse: 0.68,
    nantes: 0.69,
    lille: 0.67,
  },
  autre: {
    paris: 0.75,
    lyon: 0.7,
    marseille: 0.68,
    bordeaux: 0.66,
    toulouse: 0.65,
    nantes: 0.64,
    lille: 0.63,
  },
};

// Minimum monthly budget for effective campaign per city (€)
const MIN_EFFECTIVE: Record<string, number> = {
  paris: 500,
  lyon: 350,
  marseille: 350,
  bordeaux: 300,
  toulouse: 300,
  nantes: 280,
  lille: 280,
};

const FALLBACK: EstimateOutput = {
  relevanceScore: 72,
  insight: "Campagne cohérente avec votre secteur cible.",
};

export const estimateCampaign = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof Input>) => Input.parse(d))
  .handler(
    async ({
      data,
    }): Promise<{ ok: true; data: EstimateOutput } | { ok: false; message: string }> => {
      assertRateLimit(`campaign-estimator:${getRequestIp()}`, {
        maxRequests: 20,
        windowMs: 60_000,
      });

      const sectorAffinity = AFFINITY[data.sector]?.[data.city] ?? 0.7;
      const budgetAdequacy = Math.min(1, data.monthlyBudget / (MIN_EFFECTIVE[data.city] ?? 300));

      const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        const score = Math.round(sectorAffinity * 65 + budgetAdequacy * 35);
        return {
          ok: true,
          data: { relevanceScore: Math.min(100, score), insight: FALLBACK.insight },
        };
      }

      const prompt = `Tu es un expert en publicité mobile sur véhicules (taxis, VTC) en France.
Évalue la pertinence de cette campagne et rédige une phrase d'accroche courte.

Campagne :
- Secteur : ${data.sector}
- Ville cible : ${data.city}
- Budget mensuel : ${data.monthlyBudget} €
- Affinité sectorielle calculée : ${(sectorAffinity * 100).toFixed(0)}%
- Adéquation budget : ${(budgetAdequacy * 100).toFixed(0)}%

Réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{
  "llmBonus": <float 0.0-1.0, ajustement qualitatif>,
  "insight": "<phrase max 80 caractères, ton Growth, en français>"
}`;

      try {
        const provider = createLovableAiGatewayProvider(apiKey);
        const { generateText } = await import("ai");
        const { text } = await generateText({
          model: provider("google/gemini-2.5-flash-lite"),
          prompt,
          temperature: 0.3,
          maxOutputTokens: 100,
        });

        const parsed = JSON.parse(
          text
            .trim()
            .replace(/^```json\s*|```$/g, "")
            .trim(),
        ) as {
          llmBonus?: number;
          insight?: string;
        };
        const llmBonus = Math.min(1, Math.max(0, Number(parsed.llmBonus) || 0.7));
        const score = Math.round(sectorAffinity * 40 + budgetAdequacy * 35 + llmBonus * 25);

        return {
          ok: true,
          data: {
            relevanceScore: Math.min(100, score),
            insight: String(parsed.insight ?? FALLBACK.insight).slice(0, 80),
          },
        };
      } catch (err) {
        captureServerException(err, { category: "ai", extra: { service: "campaign-estimator" } });
        const score = Math.round(sectorAffinity * 65 + budgetAdequacy * 35);
        return {
          ok: true,
          data: { relevanceScore: Math.min(100, score), insight: FALLBACK.insight },
        };
      }
    },
  );
