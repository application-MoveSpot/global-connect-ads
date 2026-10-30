import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CopilotSuggestion = {
  description: string;
  audience: string;
  suggestedVehicles: string[];
};

export type CopilotResult = ({ ok: true } & CopilotSuggestion) | { ok: false; message: string };

// ── Validation ────────────────────────────────────────────────────────────────

const Input = z.object({
  description: z.string().min(20).max(1200),
  vehicleTypes: z.array(z.string()).optional(),
  adFormat: z.string().max(60).optional(),
  _auth: z.string().optional(),
});

const VALID_VEHICLES = new Set([
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

// ── Server function ───────────────────────────────────────────────────────────

export const optimizeBriefDescription = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof Input>) => Input.parse(d))
  .handler(async ({ data }): Promise<CopilotResult> => {
    assertRateLimit(`brief-copilot:${getRequestIp()}`, { maxRequests: 15, windowMs: 60_000 });

    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok) {
      return {
        ok: false,
        message: "Vous devez être connecté pour utiliser le Brief Copilot.",
      };
    }

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return { ok: false, message: "Service IA temporairement indisponible." };
    }

    const vehicleCtx = data.vehicleTypes?.length
      ? `Véhicules déjà sélectionnés : ${data.vehicleTypes.join(", ")}.`
      : "";
    const formatCtx = data.adFormat ? `Format publicitaire choisi : ${data.adFormat}.` : "";

    const prompt = `Tu es un expert en copywriting pour la publicité mobile sur véhicules (taxi, VTC, food truck, van) en France — plateforme MoveSpot.

L'annonceur a tapé cette description brute de campagne :
"${data.description}"
${vehicleCtx}
${formatCtx}

Ta mission (3 sorties JSON) :
1. "description" — Réécris-la : message percutant, ton marketing, orienté passant dans la rue (max 280 mots). Conserve l'intention originale.
2. "audience" — Définis l'audience cible précise : tranche d'âge, CSP, zone géographique, comportement d'achat (20-50 mots).
3. "suggestedVehicles" — 1 à 3 types parmi : camion_led, food_truck, van, taxi, scooter, velo_cargo, velo_remorque, triporteur, tutuk, voiture, autre.

Réponds UNIQUEMENT en JSON strict, sans markdown :
{"description":"...","audience":"...","suggestedVehicles":["..."]}`;

    try {
      const provider = createLovableAiGatewayProvider(apiKey);
      const { generateText } = await import("ai");
      const { text } = await generateText({
        model: provider("google/gemini-2.5-flash-lite"),
        prompt,
        temperature: 0.55,
        maxOutputTokens: 700,
      });

      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = (fence ? fence[1] : text).trim();
      const parsed = JSON.parse(raw) as {
        description?: string;
        audience?: string;
        suggestedVehicles?: unknown;
      };

      const vehicles = Array.isArray(parsed.suggestedVehicles)
        ? (parsed.suggestedVehicles as string[]).filter((v) => VALID_VEHICLES.has(v)).slice(0, 3)
        : [];

      return {
        ok: true,
        description: String(parsed.description ?? data.description).slice(0, 2000),
        audience: String(parsed.audience ?? "").slice(0, 200),
        suggestedVehicles: vehicles,
      };
    } catch (err) {
      captureServerException(err, { category: "ai", extra: { service: "brief-copilot" } });
      return { ok: false, message: "L'IA n'a pas pu optimiser votre description. Réessayez." };
    }
  });
