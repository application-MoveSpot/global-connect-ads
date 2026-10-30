import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const VariationInput = z.object({
  baseImageUrl: z.string().url().max(2000),
  adjustmentPrompt: z.string().min(5).max(500),
  basePrompt: z.string().max(1000).optional(),
  briefSessionId: z.string().uuid().optional(),
  _auth: z.string().optional(),
});

export type MockupVariationResult =
  | { ok: true; imageUrl: string }
  | { ok: false; code: "UNAUTHORIZED" | "UNAVAILABLE" | "RATE_LIMITED"; message: string };

export const generateMockupVariation = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof VariationInput>) => VariationInput.parse(d))
  .handler(async ({ data }): Promise<MockupVariationResult> => {
    assertRateLimit(`mockup-variation:${getRequestIp()}`, {
      maxRequests: 10,
      windowMs: 60 * 60_000, // 10 variations per hour per IP
    });

    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Vous devez être connecté pour générer une variation.",
      };
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return { ok: false, code: "UNAVAILABLE", message: "Service de génération indisponible." };
    }

    // Merge base context with the provider's adjustment
    const fullPrompt = data.basePrompt
      ? `${data.basePrompt}. Modification : ${data.adjustmentPrompt}`
      : `Professional advertising vehicle wrap mockup. ${data.adjustmentPrompt}. Realistic photorealistic style, high quality`;

    try {
      const res = await fetch("https://fal.run/fal-ai/flux-general/image-to-image", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_url: data.baseImageUrl,
          prompt: fullPrompt,
          strength: 0.7, // preserve structure, apply changes
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        captureServerException(new Error(`fal.ai variation ${res.status}: ${body}`), {
          category: "ai",
          extra: { service: "fal.ai/variation", status: res.status },
        });
        return {
          ok: false,
          code: "UNAVAILABLE",
          message: "La génération de variation a échoué. Réessayez.",
        };
      }

      const json = (await res.json()) as { images?: Array<{ url: string }> };
      const imageUrl = json.images?.[0]?.url;
      if (!imageUrl) {
        captureServerException(new Error("fal.ai variation: no image URL"), { category: "ai" });
        return {
          ok: false,
          code: "UNAVAILABLE",
          message: "La génération de variation a échoué. Réessayez.",
        };
      }

      return { ok: true, imageUrl };
    } catch (err) {
      captureServerException(err, { category: "ai", extra: { service: "fal.ai/variation" } });
      return { ok: false, code: "UNAVAILABLE", message: "Erreur réseau. Réessayez." };
    }
  });
