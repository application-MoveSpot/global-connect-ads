import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const BriefGenerateInput = z.object({
  businessContext: z.string().min(10).max(600),
  vehicleTypes: z.array(z.string()).optional(),
  zone: z.string().max(200).optional(),
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
  .validator((d: z.infer<typeof BriefGenerateInput>) =>
    BriefGenerateInput.parse(d),
  )
  .handler(async ({ data }): Promise<BriefSuggestionResult> => {
    assertRateLimit(`brief-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
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

    const vehicleLabel =
      data.vehicleTypes?.length
        ? `Véhicules envisagés : ${data.vehicleTypes.join(", ")}.`
        : "";
    const zoneLabel = data.zone ? `Zone cible : ${data.zone}.` : "";

    const VEHICLE_VALUES = "camion_led, food_truck, van, taxi, scooter, velo_cargo, velo_remorque, triporteur, tutuk, voiture, autre";

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

    try {
      const VALID_VEHICLE_TYPES = new Set(["camion_led","food_truck","van","taxi","scooter","velo_cargo","velo_remorque","triporteur","tutuk","voiture","autre"]);
      const { generateText } = await import("ai");
      const { text } = await generateText({ model, prompt, temperature: 0.7, maxOutputTokens: 800 });
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as BriefSuggestion;
      const vehicleTypes = Array.isArray(parsed.vehicleTypes)
        ? parsed.vehicleTypes.filter((v) => typeof v === "string" && VALID_VEHICLE_TYPES.has(v)).slice(0, 3)
        : undefined;
      return {
        ok: true,
        suggestion: {
          title: String(parsed.title ?? "").slice(0, 120),
          description: String(parsed.description ?? "").slice(0, 2000),
          audience: String(parsed.audience ?? "").slice(0, 200),
          vehicleTypes: vehicleTypes?.length ? vehicleTypes : undefined,
          zones: parsed.zones ? String(parsed.zones).slice(0, 300) : undefined,
          budget: typeof parsed.budget === "number" && parsed.budget > 0 ? Math.round(parsed.budget) : undefined,
          durationDays: typeof parsed.durationDays === "number" && parsed.durationDays > 0 ? Math.round(parsed.durationDays) : undefined,
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
