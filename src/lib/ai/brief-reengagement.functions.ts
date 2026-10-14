import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const BriefReengagementInput = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
  vehicleTypes: z.array(z.string()).optional(),
  zones: z.array(z.string()).optional(),
  budgetMax: z.number().optional(),
  daysCount: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  proposalCount: z.number(),
  hoursElapsed: z.number(),
});

export type BriefReengagementResult = {
  tips: Array<{ icon: string; title: string; body: string }>;
  summary: string;
};

export const suggestBriefAdjustments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof BriefReengagementInput>) => BriefReengagementInput.parse(d))
  .handler(async ({ data, context }): Promise<BriefReengagementResult> => {
    assertRateLimit(`brief-reengagement:${context.userId}`, { maxRequests: 10, windowMs: 60_000 });
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const { generateText } = await import("ai");

    const prompt = `Tu es un conseiller en publicité mobile pour des particuliers en France. Un annonceur a publié un brief il y a ${Math.round(data.hoursElapsed)}h et n'a reçu que ${data.proposalCount} proposition(s).

Brief :
- Titre : "${data.title}"
- Description : "${data.description.slice(0, 400)}"
- Véhicules demandés : ${data.vehicleTypes?.join(", ") ?? "non précisé"}
- Zones : ${data.zones?.join(", ") ?? "non précisé"}
- Budget max : ${data.budgetMax ? `${data.budgetMax}€` : "non précisé"}
- Durée : ${data.daysCount ? `${data.daysCount} jour(s)` : "non précisé"}
- Dates : ${data.startDate ?? "?"} → ${data.endDate ?? "?"}

Identifie 2 à 3 raisons concrètes pour lesquelles ce brief attire peu de propositions et propose des ajustements simples. Parle en français simple, sans jargon, à la 2e personne (tu/toi). Chaque conseil doit être actionnable immédiatement.

Réponds UNIQUEMENT en JSON strict :
{
  "summary": "Une phrase bienveillante expliquant la situation (20-40 mots)",
  "tips": [
    {
      "icon": "💰",
      "title": "Titre court du conseil (max 50 chars)",
      "body": "Explication pratique (1-2 phrases, max 120 chars)"
    }
  ]
}`;

    let text: string;
    try {
      ({ text } = await generateText({ model, prompt, temperature: 0.4, maxOutputTokens: 400 }));
    } catch (err) {
      captureServerException(err, { category: "ai", userId: context.userId });
      throw err;
    }

    try {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as BriefReengagementResult;
      return {
        summary: String(parsed.summary ?? "").slice(0, 300),
        tips: Array.isArray(parsed.tips)
          ? parsed.tips.slice(0, 3).map((tip) => ({
              icon: String(tip.icon ?? "💡").slice(0, 4),
              title: String(tip.title ?? "").slice(0, 80),
              body: String(tip.body ?? "").slice(0, 200),
            }))
          : [],
      };
    } catch {
      return {
        summary: "Quelques ajustements peuvent attirer plus de propriétaires.",
        tips: [
          {
            icon: "💰",
            title: "Augmentez légèrement votre budget",
            body: "Un budget plus généreux attire plus de véhicules disponibles.",
          },
          {
            icon: "📍",
            title: "Élargissez votre zone géographique",
            body: "Une zone plus large donne accès à plus de véhicules.",
          },
        ],
      };
    }
  });
