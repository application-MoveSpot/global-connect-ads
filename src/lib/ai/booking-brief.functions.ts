import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const BookingBriefInput = z.object({
  briefText: z.string().min(5).max(600),
  vehicleType: z.string().max(80).optional(),
  vehicleLocation: z.string().max(200).optional(),
  _auth: z.string().optional(),
});

export type BookingDraft = {
  message: string;
  brandColor: string;
  dailyStart: string;
  dailyEnd: string;
  waypoints: string[];
  durationDays: number;
};

export type BookingDraftResult =
  | { ok: true; draft: BookingDraft }
  | { ok: false; code: "UNAUTHORIZED" | "AI_UNAVAILABLE"; message: string };

export const generateBookingDraft = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof BookingBriefInput>) => BookingBriefInput.parse(d))
  .handler(async ({ data }): Promise<BookingDraftResult> => {
    assertRateLimit(`booking-brief:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });

    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok && auth.reason === "config_missing") {
      return { ok: false, code: "AI_UNAVAILABLE", message: "Service IA temporairement indisponible." };
    }
    if (!auth.ok) {
      const message =
        auth.reason === "token_expired"
          ? "Votre session a expiré — rechargez la page."
          : "Vous devez être connecté pour utiliser l'assistant IA.";
      return { ok: false, code: "UNAUTHORIZED", message };
    }

    const platformKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!platformKey) {
      return { ok: false, code: "AI_UNAVAILABLE", message: "Service IA indisponible." };
    }

    const vehicleCtx = [
      data.vehicleType ? `Type de véhicule : ${data.vehicleType}.` : "",
      data.vehicleLocation ? `Zone du véhicule : ${data.vehicleLocation}.` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const prompt = `Tu es un expert en publicité mobile pour la plateforme MoveSpot (France).
Un annonceur veut réserver un emplacement publicitaire sur un véhicule. À partir de sa description de marque, génère les paramètres optimaux pour sa campagne.

Description de la marque : ${data.briefText}
${vehicleCtx}

Génère en JSON strict :
{
  "message": "Message de campagne accrocheur, 200-400 caractères, ton publicitaire, adapté à la pub mobile sur véhicule. Mentionne la marque, le produit clé, une incitation à l'action ou un code promo si donné.",
  "brandColor": "#HEX couleur principale de la marque (déduit du secteur/nom, ex: mode→noir, tech→bleu, bio→vert)",
  "dailyStart": "HH:MM heure de début conseillée (format 24h, entre 06:00 et 10:00 selon la cible)",
  "dailyEnd": "HH:MM heure de fin conseillée (format 24h, entre 18:00 et 22:00 selon la cible)",
  "waypoints": ["Étape 1 (lieu précis, ville)", "Étape 2", "Étape 3"],
  "durationDays": 7
}

Règles :
- message : max 450 caractères, pas de coordonnées ni URL longues
- brandColor : couleur HEX valide (#RRGGBB)
- dailyStart/dailyEnd : format HH:MM strict, respecter max 10h/jour
- waypoints : 2 à 4 étapes pertinentes basées sur la zone de diffusion mentionnée ou la zone du véhicule, noms de lieux réels en France
- durationDays : entre 3 et 30 jours, adapté au budget/objectif mentionné

Réponds UNIQUEMENT en JSON strict, sans markdown ni commentaires.`;

    try {
      const { generateText } = await import("ai");
      const provider = createLovableAiGatewayProvider(platformKey);
      const { text } = await generateText({
        model: provider("google/gemini-2.5-flash"),
        prompt,
        temperature: 0.4,
        maxOutputTokens: 1200,
      });

      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as BookingDraft;

      const clampTime = (t: string, fallback: string): string => {
        if (/^\d{2}:\d{2}$/.test(t)) return t;
        return fallback;
      };
      const clampColor = (c: string): string =>
        /^#[0-9A-Fa-f]{6}$/.test(c) ? c : "#3B82F6";

      const waypoints = Array.isArray(parsed.waypoints)
        ? parsed.waypoints.filter((w) => typeof w === "string" && w.length > 0).slice(0, 4)
        : [];

      return {
        ok: true,
        draft: {
          message: String(parsed.message ?? "").slice(0, 450),
          brandColor: clampColor(String(parsed.brandColor ?? "")),
          dailyStart: clampTime(String(parsed.dailyStart ?? ""), "08:00"),
          dailyEnd: clampTime(String(parsed.dailyEnd ?? ""), "20:00"),
          waypoints,
          durationDays: Math.min(30, Math.max(3, Math.round(Number(parsed.durationDays) || 7))),
        },
      };
    } catch (err) {
      captureServerException(err, { category: "ai", extra: { fn: "generateBookingDraft" } });
      return { ok: false, code: "AI_UNAVAILABLE", message: "L'IA n'a pas pu générer la campagne. Réessayez." };
    }
  });
