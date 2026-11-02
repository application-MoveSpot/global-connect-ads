import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";
import { generateText } from "ai";

const Input = z.object({
  imageDataUrl: z.string().max(4_000_000),
});

export type VehicleOcrResult = {
  marque: string | null;
  modele: string | null;
  immatriculation: string | null;
  vin: string | null;
  dateCirculation: string | null;
  energie: string | null;
  confidence: "high" | "medium" | "low";
};

export const extractVehicleFromImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof Input>) => Input.parse(d))
  .handler(async ({ data, context }): Promise<VehicleOcrResult> => {
    assertRateLimit(`vehicle-ocr:${context.userId}`, { maxRequests: 10, windowMs: 3_600_000 });

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("Service IA indisponible");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const prompt = `Tu es un assistant OCR expert en documents officiels français de véhicules.
Analyse cette image (carte grise française, certificat d'immatriculation, ou photo du véhicule).

Extrais les informations suivantes et retourne UNIQUEMENT un JSON strict :
{
  "marque": "RENAULT",
  "modele": "CLIO",
  "immatriculation": "AB-123-CD",
  "vin": "VF1...",
  "dateCirculation": "2020-03-15",
  "energie": "ESSENCE",
  "confidence": "high"
}

Règles :
- immatriculation : format SIV français (AA-000-AA) ou ancien format, null si absent
- dateCirculation : format ISO YYYY-MM-DD, null si absent
- energie : ESSENCE, DIESEL, ELECTRIQUE, HYBRIDE, GPL, ou null
- confidence : "high" si document clair et lisible, "medium" si partiel, "low" si image floue
- Si un champ est illisible ou absent : null (pas de devinette)
- Retourne UNIQUEMENT le JSON, sans markdown ni explication`;

    try {
      const { text } = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", image: data.imageDataUrl },
              { type: "text", text: prompt },
            ],
          },
        ],
        temperature: 0,
        maxOutputTokens: 300,
      });

      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = (fence ? fence[1] : text).trim();
      const parsed = JSON.parse(raw) as VehicleOcrResult;

      return {
        marque: parsed.marque ? String(parsed.marque).toUpperCase().slice(0, 50) : null,
        modele: parsed.modele ? String(parsed.modele).toUpperCase().slice(0, 50) : null,
        immatriculation: parsed.immatriculation
          ? String(parsed.immatriculation).toUpperCase().replace(/\s/g, "-").slice(0, 20)
          : null,
        vin: parsed.vin ? String(parsed.vin).slice(0, 17) : null,
        dateCirculation: parsed.dateCirculation
          ? String(parsed.dateCirculation).slice(0, 10)
          : null,
        energie: parsed.energie ? String(parsed.energie).toUpperCase().slice(0, 20) : null,
        confidence: ["high", "medium", "low"].includes(parsed.confidence)
          ? parsed.confidence
          : "low",
      };
    } catch (err) {
      captureServerException(err, { category: "ai", userId: context.userId });
      return {
        marque: null,
        modele: null,
        immatriculation: null,
        vin: null,
        dateCirculation: null,
        energie: null,
        confidence: "low",
      };
    }
  });
