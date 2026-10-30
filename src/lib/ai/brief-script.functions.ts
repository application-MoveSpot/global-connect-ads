import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VideoScriptResult =
  { ok: true; script: string; duration: string; scenes: string[] } | { ok: false; message: string };

// ── Validation ────────────────────────────────────────────────────────────────

const Input = z.object({
  title: z.string().max(120),
  description: z.string().min(20).max(1200),
  vehicleTypes: z.array(z.string()).optional(),
  adFormat: z.string().max(60).optional(),
  _auth: z.string().optional(),
});

// ── Server function ───────────────────────────────────────────────────────────

export const generateVideoScript = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof Input>) => Input.parse(d))
  .handler(async ({ data }): Promise<VideoScriptResult> => {
    assertRateLimit(`brief-script:${getRequestIp()}`, { maxRequests: 10, windowMs: 60_000 });

    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok) {
      return { ok: false, message: "Vous devez être connecté pour générer un script vidéo." };
    }

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return { ok: false, message: "Service IA temporairement indisponible." };
    }

    const vehicleCtx = data.vehicleTypes?.length
      ? `Véhicules publicitaires : ${data.vehicleTypes.join(", ")}.`
      : "";
    const formatCtx = data.adFormat ? `Format publicitaire : ${data.adFormat}.` : "";

    const prompt = `Tu es expert en production de vidéos publicitaires courtes (style réseaux sociaux, 15-30 secondes) pour la publicité mobile sur véhicules en France — plateforme MoveSpot.

Campagne : "${data.title}"
Brief : "${data.description}"
${vehicleCtx}
${formatCtx}

Génère un script vidéo percutant en JSON strict (sans markdown) :
{"script":"Narration complète prête à lire (max 120 mots, ton dynamique)","duration":"15s","scenes":["Description visuelle scène 1","scène 2","scène 3"]}

Règles : 2 à 4 scènes max. duration parmi "15s" | "20s" | "30s". Chaque scène = 1 phrase courte décrivant l'image ou l'action à filmer. Ton percutant, adapté à une audience urbaine française.`;

    try {
      const provider = createLovableAiGatewayProvider(apiKey);
      const { generateText } = await import("ai");
      const { text } = await generateText({
        model: provider("google/gemini-2.5-flash-lite"),
        prompt,
        temperature: 0.6,
        maxOutputTokens: 500,
      });

      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = (fence ? fence[1] : text).trim();
      const parsed = JSON.parse(raw) as {
        script?: string;
        duration?: string;
        scenes?: unknown;
      };

      const scenes = Array.isArray(parsed.scenes) ? (parsed.scenes as string[]).slice(0, 4) : [];
      const duration = ["15s", "20s", "30s"].includes(String(parsed.duration))
        ? String(parsed.duration)
        : "20s";

      return {
        ok: true,
        script: String(parsed.script ?? "").slice(0, 600),
        duration,
        scenes,
      };
    } catch (err) {
      captureServerException(err, { category: "ai", extra: { service: "brief-script" } });
      return { ok: false, message: "L'IA n'a pas pu générer le script. Réessayez." };
    }
  });
