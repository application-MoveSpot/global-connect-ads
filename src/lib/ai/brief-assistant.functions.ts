import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider, createUserKeyProvider, getUserKeyModel } from "./ai-gateway.server";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const BriefGenerateInput = z.object({
  businessContext: z.string().min(10).max(600),
  vehicleTypes: z.array(z.string()).optional(),
  zone: z.string().max(200).optional(),
  // Explicit token fallback: the client sends the access token in the
  // payload so auth works even when the Authorization header middleware
  // fails to attach (observed in some Cloudflare Workers deployments).
  _auth: z.string().optional(),
  // User-supplied Google AI key (BYOK). Used only when platform key is absent.
  userApiKey: z.string().max(300).optional(),
});

export type BriefSuggestion = {
  title: string;
  description: string;
  audience: string;
  vehicleTypes?: string[];
  zones?: string;
  budget?: number;
  durationDays?: number;
};

export type BriefSuggestionResult =
  | { ok: true; suggestion: BriefSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const generateBriefSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof BriefGenerateInput>) => BriefGenerateInput.parse(d))
  .handler(async ({ data }): Promise<BriefSuggestionResult> => {
    assertRateLimit(`brief-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok && auth.reason === "config_missing") {
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "Le service IA est temporairement indisponible. Réessayez.",
      };
    }
    if (!auth.ok) {
      const message =
        auth.reason === "token_expired"
          ? "Votre session a expiré — rechargez la page ou reconnectez-vous."
          : auth.reason === "no_token"
            ? "Vous devez être connecté pour utiliser l'assistant IA."
            : "Session invalide — reconnectez-vous puis réessayez.";
      return { ok: false, code: "UNAUTHORIZED", message };
    }

    const platformKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!platformKey && !data.userApiKey) {
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "Le service IA est indisponible. Réessayez.",
      };
    }

    // User-supplied key routes directly to the detected provider (Google/OpenAI/Mistral).
    const usingUserKey = !platformKey && !!data.userApiKey;
    const provider = platformKey
      ? createLovableAiGatewayProvider(platformKey)
      : createUserKeyProvider(data.userApiKey!);
    // When using a user key, use the best model for that provider; otherwise try Gemini models in order.
    const FALLBACK_MODELS = usingUserKey
      ? [getUserKeyModel(data.userApiKey!)]
      : ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];

    const vehicleLabel = data.vehicleTypes?.length
      ? `Véhicules envisagés : ${data.vehicleTypes.join(", ")}.`
      : "";
    const zoneLabel = data.zone ? `Zone cible : ${data.zone}.` : "";

    const VEHICLE_VALUES =
      "camion_led, food_truck, van, taxi, scooter, velo_cargo, velo_remorque, triporteur, tutuk, voiture, autre";

    const prompt = `Tu es un expert en publicité extérieure mobile (véhicules publicitaires en France).
Un annonceur veut créer un brief sur la plateforme MoveSpot. À partir de sa description, génère :
1. Un titre accrocheur (max 80 caractères) — commence par l'action ou le nom de la marque
2. Une description convaincante (3-5 phrases, 150-300 mots) — message clé, ton, ce que verront les passants
3. L'audience cible (20-60 mots) — âge, CSP, zone, comportements
4. Les types de véhicules les plus adaptés parmi : ${VEHICLE_VALUES} (1 à 3 valeurs, tableau JSON)
5. Les zones géographiques cibles séparées par des virgules (noms de villes, quartiers, arrondissements)
6. Un budget maximum suggéré en euros entiers (optionnel, uniquement si clairement mentionné dans le contexte)
7. Une durée en jours de campagne suggérée (optionnel, uniquement si clairement mentionné)

Contexte annonceur : ${data.businessContext}
${vehicleLabel}
${zoneLabel}

Réponds UNIQUEMENT en JSON strict (les clés budget et durationDays sont optionnelles) :
{
  "title": "...",
  "description": "...",
  "audience": "...",
  "vehicleTypes": ["..."],
  "zones": "...",
  "budget": 500,
  "durationDays": 14
}`;

    const VALID_VEHICLE_TYPES = new Set([
      "camion_led",
      "food_truck",
      "van",
      "taxi",
      "scooter",
      "velo_cargo",
      "velo_remorque",
      "triporteur",
      "tutuk",
      "voiture",
      "autre",
    ]);

    const { generateText } = await import("ai");

    let lastErr: unknown;
    for (const modelId of FALLBACK_MODELS) {
      try {
        const { text } = await generateText({
          model: provider(modelId),
          prompt,
          temperature: 0.7,
          maxOutputTokens: 800,
        });
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const raw = fence ? fence[1] : text;
        const parsed = JSON.parse(raw.trim()) as BriefSuggestion;
        const vehicleTypes = Array.isArray(parsed.vehicleTypes)
          ? parsed.vehicleTypes
              .filter((v) => typeof v === "string" && VALID_VEHICLE_TYPES.has(v))
              .slice(0, 3)
          : undefined;
        return {
          ok: true,
          suggestion: {
            title: String(parsed.title ?? "").slice(0, 120),
            description: String(parsed.description ?? "").slice(0, 2000),
            audience: String(parsed.audience ?? "").slice(0, 200),
            vehicleTypes: vehicleTypes?.length ? vehicleTypes : undefined,
            zones: parsed.zones ? String(parsed.zones).slice(0, 300) : undefined,
            budget:
              typeof parsed.budget === "number" && parsed.budget > 0
                ? Math.round(parsed.budget)
                : undefined,
            durationDays:
              typeof parsed.durationDays === "number" && parsed.durationDays > 0
                ? Math.round(parsed.durationDays)
                : undefined,
          },
        };
      } catch (err) {
        lastErr = err;
        captureServerException(err, { category: "ai", extra: { model: modelId } });
      }
    }

    captureServerException(lastErr, { category: "ai", extra: { note: "all models failed" } });
    return {
      ok: false,
      code: "AI_UNAVAILABLE",
      message: "L'IA n'a pas pu générer de suggestion. Réessayez.",
    };
  });
