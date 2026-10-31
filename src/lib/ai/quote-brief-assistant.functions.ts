import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  createLovableAiGatewayProvider,
  createUserKeyProvider,
  getUserKeyModel,
} from "./ai-gateway.server";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const SynthesizeInput = z.object({
  serviceType: z.string().max(100),
  vehicleType: z.string().max(100).optional(),
  answers: z
    .record(z.string(), z.string().max(500))
    .refine((r) => Object.keys(r).length <= 10, { message: "Trop de réponses" }),
  _auth: z.string().optional(),
  userApiKey: z.string().max(300).optional(),
});

export type QuoteBriefSynthesisResult =
  | { ok: true; message: string }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const synthesizeQuoteBrief = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof SynthesizeInput>) => SynthesizeInput.parse(d))
  .handler(async ({ data }): Promise<QuoteBriefSynthesisResult> => {
    assertRateLimit(`quote-brief-synth:${getRequestIp()}`, { maxRequests: 20, windowMs: 60_000 });

    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok && auth.reason === "config_missing") {
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "Service IA temporairement indisponible.",
      };
    }
    if (!auth.ok) {
      const message =
        auth.reason === "token_expired"
          ? "Votre session a expiré — rechargez la page."
          : "Vous devez être connecté pour utiliser l'assistant IA.";
      return { ok: false, code: "UNAUTHORIZED", message };
    }

    const platformKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!platformKey && !data.userApiKey) {
      return { ok: false, code: "AI_UNAVAILABLE", message: "Service IA indisponible." };
    }

    const usingUserKey = !platformKey && !!data.userApiKey;
    const provider = platformKey
      ? createLovableAiGatewayProvider(platformKey)
      : createUserKeyProvider(data.userApiKey!);
    const FALLBACK_MODELS = usingUserKey
      ? [getUserKeyModel(data.userApiKey!)]
      : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    const answers = data.answers as Record<string, string>;
    const answersText = Object.entries(answers)
      .filter(([, v]) => v.trim())
      .map(([q, a]) => `- ${q} : ${a}`)
      .join("\n");

    const prompt = `Tu es un assistant spécialisé en communication visuelle pour des véhicules publicitaires.
Un annonceur a répondu à un questionnaire pour exprimer son besoin créatif. Génère une description claire et professionnelle de 3 à 5 phrases à envoyer au prestataire.

Type de service demandé : ${data.serviceType}
${data.vehicleType ? `Type de véhicule : ${data.vehicleType}` : ""}

Réponses du questionnaire :
${answersText}

Instructions :
- Écris en français, ton professionnel mais accessible
- Inclure : le message clé, le ton visuel souhaité, les contraintes importantes, les références si mentionnées
- Ne jamais inventer d'informations qui ne sont pas dans les réponses
- Maximum 300 mots

Réponds UNIQUEMENT avec le texte de description, sans introduction ni commentaire.`;

    const { generateText } = await import("ai");

    let lastErr: unknown;
    for (const modelId of FALLBACK_MODELS) {
      try {
        const { text } = await generateText({
          model: provider(modelId),
          prompt,
          temperature: 0.4,
          maxOutputTokens: 400,
        });
        return { ok: true, message: text.trim().slice(0, 2000) };
      } catch (err) {
        lastErr = err;
        captureServerException(err, { category: "ai", extra: { model: modelId } });
      }
    }

    captureServerException(lastErr, { category: "ai", extra: { note: "all models failed" } });
    return {
      ok: false,
      code: "AI_UNAVAILABLE",
      message: "L'IA n'a pas pu synthétiser votre besoin. Réessayez.",
    };
  });
