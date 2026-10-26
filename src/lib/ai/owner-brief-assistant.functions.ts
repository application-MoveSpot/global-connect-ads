import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const OwnerBriefProposalInput = z.object({
  briefTitle: z.string().max(200),
  briefDescription: z.string().max(1000),
  briefZones: z.array(z.string().max(100)).max(20).optional(),
  briefDays: z.number().int().min(1).max(3650).optional(),
  briefBudgetMax: z.number().positive().optional(),
  vehicleName: z.string().max(100),
  vehicleType: z.string().max(100),
  vehiclePricePerDay: z.number().positive().optional(),
});

export type OwnerBriefProposalResult =
  | { ok: true; message: string; suggestedPrice: number | null }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const generateOwnerBriefProposal = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof OwnerBriefProposalInput>) => OwnerBriefProposalInput.parse(d))
  .handler(async ({ data }): Promise<OwnerBriefProposalResult> => {
    assertRateLimit(`owner-brief-proposal:${getRequestIp()}`, {
      maxRequests: 10,
      windowMs: 60_000,
    });
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

    const details = [
      `Titre du brief : ${data.briefTitle}`,
      `Description : ${data.briefDescription}`,
      data.briefZones && data.briefZones.length > 0 && `Zones : ${data.briefZones.join(", ")}`,
      data.briefDays && `Durée : ${data.briefDays} jour(s)`,
      data.briefBudgetMax && `Budget max annonceur : ${data.briefBudgetMax} €/jour`,
      `Véhicule proposé : ${data.vehicleName} (${data.vehicleType})`,
      data.vehiclePricePerDay && `Prix catalogue du véhicule : ${data.vehiclePricePerDay} €/jour`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `Tu es un propriétaire de véhicule qui répond à un brief publicitaire sur la plateforme MoveSpot (publicité mobile sur véhicules en France).

Génère deux choses :
1. Un message de proposition professionnel et concis (3 à 4 phrases). Mets en valeur le véhicule proposé et montre ta motivation. Ne mentionne pas le prix dans le message. Ne commence pas par "Bonjour" seul — intègre-le dans une phrase d'accueil complète.
2. Un prix suggéré en €/jour : reste sous 70 % du budget max annonceur si disponible, sinon utilise le prix catalogue du véhicule. Renvoie un entier.

Contexte :
${details}

Réponds UNIQUEMENT en JSON strict :
{ "message": "texte du message", "suggestedPrice": 42 }`;

    try {
      const { generateText } = await import("ai");
      const provider = createLovableAiGatewayProvider(apiKey);
      const model = provider("google/gemini-2.5-flash");
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.4,
        maxOutputTokens: 400,
      });
      const raw = text.trim();
      if (!raw)
        return {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "L'IA n'a pas pu générer de proposition. Réessayez.",
        };
      let message = raw;
      let suggestedPrice: number | null = null;
      try {
        // Strip markdown code fences (```json ... ``` or ``` ... ```)
        const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
        // Extract first JSON object even if AI added preamble text
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : stripped;
        const parsed = JSON.parse(jsonStr) as { message?: string; suggestedPrice?: number };
        if (parsed.message) message = parsed.message;
        if (typeof parsed.suggestedPrice === "number" && parsed.suggestedPrice > 0) {
          suggestedPrice = Math.round(parsed.suggestedPrice);
        }
      } catch {
        // AI didn't return JSON — use raw text as message, no price
      }
      return { ok: true, message, suggestedPrice };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "L'IA n'a pas pu générer de message. Réessayez.",
      };
    }
  });
