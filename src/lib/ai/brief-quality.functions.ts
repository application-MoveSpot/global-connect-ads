import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const BriefQualityInput = z.object({
  title: z.string().max(200),
  description: z.string().max(2000),
  audience: z.string().max(200).optional(),
  vehicleTypes: z.array(z.string()).optional(),
  zone: z.string().max(200).optional(),
});

export type BriefQualityResult = {
  global: number; // 0–10
  scores: {
    message: number;
    audience: number;
    zone: number;
  };
  tips: string[];
};

export const scoreBriefQuality = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof BriefQualityInput>) => BriefQualityInput.parse(d))
  .handler(async ({ data, context }): Promise<BriefQualityResult> => {
    assertRateLimit(`brief-quality:${context.userId}`, { maxRequests: 30, windowMs: 60_000 });
    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const { generateText } = await import("ai");

    const prompt = `Tu es expert en publicité extérieure mobile. Évalue ce brief publicitaire sur une plateforme de mise en relation.

Titre : "${data.title}"
Description : "${data.description}"
Audience cible : "${data.audience ?? "non renseignée"}"
Types de véhicules : ${data.vehicleTypes?.join(", ") ?? "non renseignés"}
Zone : "${data.zone ?? "non renseignée"}"

Évalue sur 10 et donne des conseils courts et actionnables :
- message : clarté du message publicitaire, accroche, call-to-action
- audience : précision de l'audience cible (âge, CSP, comportements)
- zone : cohérence zone/véhicule/audience

Réponds UNIQUEMENT en JSON strict :
{
  "global": 7,
  "scores": { "message": 8, "audience": 5, "zone": 7 },
  "tips": ["Conseil 1 court (max 80 chars)", "Conseil 2", "Conseil 3"]
}`;

    let text: string;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      ({ text } = await generateText({
        model,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 300,
        abortSignal: controller.signal,
      }));
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { global: 5, scores: { message: 5, audience: 5, zone: 5 }, tips: [] };
      }
      captureServerException(err, { category: "ai", userId: context.userId });
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    try {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as BriefQualityResult;
      return {
        global: Math.min(10, Math.max(0, Number(parsed.global ?? 5))),
        scores: {
          message: Math.min(10, Math.max(0, Number(parsed.scores?.message ?? 5))),
          audience: Math.min(10, Math.max(0, Number(parsed.scores?.audience ?? 5))),
          zone: Math.min(10, Math.max(0, Number(parsed.scores?.zone ?? 5))),
        },
        tips: Array.isArray(parsed.tips) ? (parsed.tips as string[]).slice(0, 3) : [],
      };
    } catch {
      return { global: 5, scores: { message: 5, audience: 5, zone: 5 }, tips: [] };
    }
  });
