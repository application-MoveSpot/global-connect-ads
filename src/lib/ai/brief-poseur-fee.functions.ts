import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const BriefPoseurFeeInput = z.object({
  vehicleTypes: z.array(z.string().max(100)).max(10),
  daysCount: z.number().int().min(1).max(3650).optional(),
  zonesCount: z.number().int().min(0).max(50).optional(),
  description: z.string().max(1000).optional(),
});

export type BriefPoseurFeeResult =
  | { ok: true; suggestedFee: number }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const suggestBriefPoseurFee = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof BriefPoseurFeeInput>) => BriefPoseurFeeInput.parse(d))
  .handler(async ({ data }): Promise<BriefPoseurFeeResult> => {
    assertRateLimit(`brief-poseur-fee:${getRequestIp()}`, {
      maxRequests: 15,
      windowMs: 60_000,
    });

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return { ok: false, code: "AI_UNAVAILABLE", message: "Service IA indisponible." };
    }

    const details = [
      `Types de véhicules : ${data.vehicleTypes.join(", ")}`,
      data.daysCount && `Durée de la campagne : ${data.daysCount} jour(s)`,
      data.zonesCount && `Nombre de zones : ${data.zonesCount}`,
      data.description && `Description : ${data.description}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `Tu es un expert en publicité mobile sur véhicules en France (covering adhésif, pose et dépose).

Estime le forfait poseur total (pose + dépose) pour une campagne avec les caractéristiques suivantes :
${details}

Règles de tarification indicatives :
- Voiture / scooter : pose 80–150 €, dépose 50–80 € → total ~130–230 €
- Van / fourgon / utilitaire : pose 150–300 €, dépose 80–120 € → total ~230–420 €
- Camion / bus / véhicule LED : pose 300–600 €, dépose 150–200 € → total ~450–800 €
- Si plusieurs types de véhicules, utilise la moyenne pondérée
- Une durée très courte (< 7 jours) ou très longue (> 90 jours) ne change pas le forfait poseur (travail fixe)

Réponds UNIQUEMENT en JSON strict, un entier en euros :
{ "suggestedFee": 180 }`;

    try {
      const { generateText } = await import("ai");
      const provider = createLovableAiGatewayProvider(apiKey);
      const model = provider("google/gemini-2.5-flash");
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.2,
        maxOutputTokens: 100,
      });
      const raw = text.trim();
      if (!raw) return { ok: false, code: "AI_UNAVAILABLE", message: "L'IA n'a pas répondu." };

      try {
        const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : stripped) as {
          suggestedFee?: number;
        };
        if (typeof parsed.suggestedFee === "number" && parsed.suggestedFee > 0) {
          return { ok: true, suggestedFee: Math.round(parsed.suggestedFee) };
        }
      } catch {
        /* fall through */
      }
      return { ok: false, code: "AI_UNAVAILABLE", message: "L'IA n'a pas pu estimer le forfait." };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return { ok: false, code: "AI_UNAVAILABLE", message: "Erreur IA. Réessayez." };
    }
  });
