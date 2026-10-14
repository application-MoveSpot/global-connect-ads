import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const ProviderQuoteInput = z.object({
  serviceType: z.string().max(100),
  vehicleType: z.string().max(100).optional(),
  format: z.string().max(100).optional(),
  quantity: z.number().int().min(1).max(1000).optional(),
  zone: z.string().max(200).optional(),
  deadline: z.string().max(50).optional(),
  advertiserMessage: z.string().max(1000),
});

export type ProviderQuoteResponseResult =
  | { ok: true; message: string }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const generateProviderQuoteResponse = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof ProviderQuoteInput>) => ProviderQuoteInput.parse(d))
  .handler(async ({ data }): Promise<ProviderQuoteResponseResult> => {
    assertRateLimit(`provider-quote-response:${getRequestIp()}`, {
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
      data.serviceType && `Type de prestation : ${data.serviceType}`,
      data.vehicleType && `Type de véhicule : ${data.vehicleType}`,
      data.format && `Format : ${data.format}`,
      data.quantity && `Quantité : ${data.quantity}`,
      data.zone && `Zone : ${data.zone}`,
      data.deadline && `Délai souhaité : ${data.deadline}`,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `Tu es un prestataire de pose de publicité sur véhicule (covering, stickers, vinyle) en France.
Rédige un message de réponse professionnel et concis (3 à 5 phrases) pour répondre positivement à cette demande de devis.
Sois courtois, direct et professionnel. Ne mentionne pas de prix (le prestataire les saisira séparément).
Ne commence pas par "Bonjour" seul — intègre-le dans une phrase d'accueil complète.

Détails de la demande :
${details}

Message de l'annonceur : "${data.advertiserMessage}"

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
          message: "L'IA n'a pas pu générer de réponse. Réessayez.",
        };
      return { ok: true, message };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "L'IA n'a pas pu générer de réponse. Réessayez.",
      };
    }
  });
