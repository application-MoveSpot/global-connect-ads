import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { hasAuthenticatedBriefRequest } from "./brief-auth.server";
import { captureServerException } from "@/lib/sentry.server";

const Input = z.object({
  // base64 data URL (data:image/jpeg;base64,...) — resized to ≤512px before sending
  imageDataUrl: z.string().max(2_500_000),
});

export type PlateBox = { x: number; y: number; width: number; height: number };

export type PlateDetectionResult =
  { ok: true; bbox: PlateBox | null } | { ok: false; message: string };

export const detectLicensePlate = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof Input>) => Input.parse(d))
  .handler(async ({ data }): Promise<PlateDetectionResult> => {
    if (!(await hasAuthenticatedBriefRequest())) {
      return { ok: false, message: "Session expirée." };
    }
    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) return { ok: false, message: "Service IA indisponible." };

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    try {
      const { generateText } = await import("ai");
      const { text } = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", image: data.imageDataUrl },
              {
                type: "text",
                text: `Locate the vehicle licence plate (plaque d'immatriculation) in this image.
Return ONLY a JSON object with the bounding box expressed as percentages of the total image dimensions (values 0–100):
{"x": <left edge %>, "y": <top edge %>, "width": <plate width %>, "height": <plate height %>}
Add a 5% margin on each side of the plate to ensure full coverage.
If there is NO visible licence plate, return the single word: null
Return ONLY the JSON object or the word null — no explanation, no markdown fences.`,
              },
            ],
          },
        ],
        temperature: 0,
        maxOutputTokens: 120,
      });

      const trimmed = text
        .trim()
        .replace(/```(?:json)?|```/g, "")
        .trim();
      if (!trimmed || trimmed === "null") return { ok: true, bbox: null };

      const parsed = JSON.parse(trimmed) as PlateBox;
      if (
        typeof parsed.x === "number" &&
        typeof parsed.y === "number" &&
        typeof parsed.width === "number" &&
        typeof parsed.height === "number"
      ) {
        // Clamp to image bounds
        const x = Math.max(0, Math.min(100, parsed.x));
        const y = Math.max(0, Math.min(100, parsed.y));
        const width = Math.max(1, Math.min(100 - x, parsed.width));
        const height = Math.max(1, Math.min(100 - y, parsed.height));
        return { ok: true, bbox: { x, y, width, height } };
      }
      return { ok: true, bbox: null };
    } catch (e) {
      captureServerException(e, { category: "ai", extra: { model: "plate-detection" } });
      return { ok: false, message: "Détection échouée." };
    }
  });
