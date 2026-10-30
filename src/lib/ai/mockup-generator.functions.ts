import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkBriefRequestAuth } from "./brief-auth.server";
import { assertRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const VEHICLE_LABELS: Record<string, string> = {
  taxi: "taxi cab",
  vtc: "VTC rideshare car",
  camionnette: "delivery van",
  moto: "motorcycle",
  trottinette: "electric scooter",
  bus: "city bus",
};

const SERVICE_LABELS: Record<string, string> = {
  covering_vehicule: "full vehicle wrap advertising livery",
  creation_graphique: "graphic design print advertising",
  production_video: "video advertising campaign visual",
};

function buildImagePrompt(
  serviceType: string,
  vehicleType: string | undefined,
  briefText: string,
): string {
  const vehicle = vehicleType ? (VEHICLE_LABELS[vehicleType] ?? vehicleType) : "commercial vehicle";
  const service = SERVICE_LABELS[serviceType] ?? "advertising campaign";
  const brief = briefText.slice(0, 220).replace(/\n+/g, " ");

  return (
    `Professional ${service} mockup on a ${vehicle}. ${brief}. ` +
    `Realistic photorealistic commercial vehicle wrap design, clean studio background, ` +
    `high-end product visualization, advertising photography, sharp details, 4K quality`
  );
}

const GenerateMockupInput = z.object({
  briefText: z.string().min(10).max(2000),
  serviceType: z.string().max(100),
  vehicleType: z.string().max(100).optional(),
  briefSessionId: z.string().uuid().optional(),
  _auth: z.string().optional(),
});

export type GenerateMockupResult =
  | { ok: true; imageUrl: string; prompt: string }
  | { ok: false; code: "UNAUTHORIZED" | "UNAVAILABLE" | "RATE_LIMITED"; message: string };

export const generateBriefMockup = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof GenerateMockupInput>) => GenerateMockupInput.parse(d))
  .handler(async ({ data }): Promise<GenerateMockupResult> => {
    assertRateLimit(`mockup-gen:${getRequestIp()}`, {
      maxRequests: 5,
      windowMs: 60 * 60_000, // 5 per hour per IP
    });

    const auth = await checkBriefRequestAuth(data._auth);
    if (!auth.ok) {
      return {
        ok: false,
        code: "UNAUTHORIZED",
        message: "Vous devez être connecté pour générer un aperçu visuel.",
      };
    }

    const falKey = process.env.FAL_API_KEY;
    if (!falKey) {
      return {
        ok: false,
        code: "UNAVAILABLE",
        message: "Service de génération d'image temporairement indisponible.",
      };
    }

    const prompt = buildImagePrompt(data.serviceType, data.vehicleType, data.briefText);

    try {
      const res = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          image_size: "square_hd",
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        captureServerException(new Error(`fal.ai ${res.status}: ${body}`), {
          category: "ai",
          extra: { service: "fal.ai", status: res.status },
        });
        return {
          ok: false,
          code: "UNAVAILABLE",
          message: "La génération d'image a échoué. Réessayez.",
        };
      }

      const json = (await res.json()) as { images?: Array<{ url: string }> };
      const imageUrl = json.images?.[0]?.url;
      if (!imageUrl) {
        captureServerException(new Error("fal.ai: no image URL"), { category: "ai" });
        return {
          ok: false,
          code: "UNAVAILABLE",
          message: "La génération d'image a échoué. Réessayez.",
        };
      }

      return { ok: true, imageUrl, prompt };
    } catch (err) {
      captureServerException(err, { category: "ai", extra: { service: "fal.ai" } });
      return {
        ok: false,
        code: "UNAVAILABLE",
        message: "Erreur réseau lors de la génération. Réessayez.",
      };
    }
  });
