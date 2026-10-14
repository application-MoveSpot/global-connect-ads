import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const DriverGenerateInput = z.object({
  driverContext: z.string().min(10).max(600),
});

export type DriverSuggestion = {
  city?: string;
  vehicleKind?: "micro_mobility" | "voiture" | "utilitaire";
  kind?: "driver" | "installer" | "both";
};

export type DriverSuggestionResult =
  | { ok: true; suggestion: DriverSuggestion }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

const VALID_VEHICLE_KINDS = new Set(["micro_mobility", "voiture", "utilitaire"]);
const VALID_KINDS = new Set(["driver", "installer", "both"]);

export const generateDriverSuggestion = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof DriverGenerateInput>) => DriverGenerateInput.parse(d))
  .handler(async ({ data }): Promise<DriverSuggestionResult> => {
    assertRateLimit(`driver-suggest:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });
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

    const prompt = `Tu es un assistant pour la plateforme MoveSpot (publicité mobile sur véhicules en France).
Un chauffeur ou poseur s'inscrit sur la plateforme. À partir de sa description, déduis :
1. Sa ville principale de travail (nom de ville uniquement, sans département ni pays)
2. Son type de véhicule parmi : micro_mobility (vélo, trottinette, scooter), voiture, utilitaire (van, camionnette, camion)
3. Son rôle parmi : driver (conduit avec la pub sur son véhicule), installer (pose les adhésifs/covering), both (les deux)

Contexte : ${data.driverContext}

Réponds UNIQUEMENT en JSON strict (toutes les clés sont optionnelles, n'inclus que celles que tu peux déduire avec confiance) :
{
  "city": "Paris",
  "vehicleKind": "voiture",
  "kind": "driver"
}`;

    try {
      const { generateText } = await import("ai");
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 200,
      });
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as DriverSuggestion;

      const suggestion: DriverSuggestion = {};
      if (typeof parsed.city === "string" && parsed.city.trim())
        suggestion.city = String(parsed.city).trim().slice(0, 100);
      if (typeof parsed.vehicleKind === "string" && VALID_VEHICLE_KINDS.has(parsed.vehicleKind))
        suggestion.vehicleKind = parsed.vehicleKind as DriverSuggestion["vehicleKind"];
      if (typeof parsed.kind === "string" && VALID_KINDS.has(parsed.kind))
        suggestion.kind = parsed.kind as DriverSuggestion["kind"];

      return { ok: true, suggestion };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return {
        ok: false,
        code: "AI_UNAVAILABLE",
        message: "L'IA n'a pas pu générer de suggestion. Réessayez.",
      };
    }
  });
