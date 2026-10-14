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
  vehicleName: z.string().max(100),
  vehicleType: z.string().max(100),
});

export type OwnerBriefProposalResult =
  | { ok: true; message: string }
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

    const apiKey = process.env.LOVABLE_API_KEY;
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
      `Véhicule proposé : ${data.vehicleName} (${data.vehicleType})`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `Tu es un propriétaire de véhicule qui répond à un brief publicitaire sur la plateforme MoveSpot (publicité mobile sur véhicules en France).
Rédige un message de proposition professionnel et concis (3 à 4 phrases) pour répondre à ce brief.
Mets en valeur le véhicule proposé et montre ta motivation. Ne mentionne pas le prix (le propriétaire le saisira séparément).
Ne commence pas par "Bonjour" seul — intègre-le dans une phrase d'accueil complète.

Contexte du brief et de la proposition :
${details}

Réponds uniquement avec le texte du message, sans titre ni formatage.`;

    try {
      const { generateText } = await import("ai");
      const provider = createLovableAiGatewayProvider(apiKey);
      const model = provider("google/gemini-2.5-flash");
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.4,
        maxOutputTokens: 300,
      });
      const message = text.trim();
      if (!message)
        return {
          ok: false,
          code: "AI_UNAVAILABLE",
          message: "L'IA n'a pas pu générer de message. Réessayez.",
        };
      return { ok: true, message };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "L'IA n'a pas pu générer de message. Réessayez.",
      };
    }
  });
