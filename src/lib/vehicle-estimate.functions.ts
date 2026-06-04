import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  type: z.string().min(1).max(50),
  condition: z.enum(["excellent", "bon", "moyen", "mauvais"]),
  surface_m2: z.number().min(0).max(100).nullable().optional(),
  km_per_day: z.number().min(0).max(2000).nullable().optional(),
  zones: z.array(z.string().max(100)).max(20).default([]),
  price_per_day: z.number().min(0).max(10000).nullable().optional(),
  photo_urls: z.array(z.string().url()).max(5).default([]),
});

type EstimateResult = {
  suggested_price_min: number;
  suggested_price_max: number;
  estimated_impressions_per_day: number;
  photo_match: "ok" | "doubtful" | "mismatch" | "unverified";
  photo_notes: string;
  condition_alert: string | null;
  ai_generated_detected: boolean;
  ai_generated_notes: string;
  recommendation: string;
};

export const estimateVehicle = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<EstimateResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    if (data.condition === "mauvais") {
      return {
        suggested_price_min: 0,
        suggested_price_max: 0,
        estimated_impressions_per_day: 0,
        photo_match: "unverified",
        photo_notes: "",
        condition_alert: "Les véhicules en mauvais état ne sont pas acceptés sur MoveSpot.",
        recommendation: "Refusé automatiquement : véhicule en mauvais état.",
      };
    }

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `Tu es un expert en publicité mobile (street marketing, véhicules publicitaires).

Analyse ce véhicule proposé sur MoveSpot et :
1. Vérifie que la/les photo(s) correspondent au type déclaré "${data.type}" et à l'état déclaré "${data.condition}".
2. Estime une fourchette de prix par jour réaliste en € (marché FR) selon type, état, surface, km/jour et zones.
3. Estime les impressions/jour réalistes (vues humaines uniques) selon km/jour, type et zones.
4. Donne une courte recommandation au propriétaire.

Données déclarées :
- Type: ${data.type}
- État déclaré: ${data.condition}
- Surface publicitaire: ${data.surface_m2 ?? "non renseignée"} m²
- Km parcourus / jour: ${data.km_per_day ?? "non renseigné"}
- Zones: ${data.zones.join(", ") || "non renseignées"}
- Prix demandé / jour: ${data.price_per_day ?? "non renseigné"} €

Réponds UNIQUEMENT en JSON strict :
{
  "suggested_price_min": number,
  "suggested_price_max": number,
  "estimated_impressions_per_day": number,
  "photo_match": "ok" | "doubtful" | "mismatch" | "unverified",
  "photo_notes": "court commentaire en français sur la cohérence photo/déclaration",
  "condition_alert": "alerte si l'état réel sur la photo semble pire que déclaré, sinon null",
  "recommendation": "1-2 phrases en français"
}`,
      },
    ];
    for (const url of data.photo_urls.slice(0, 3)) {
      content.push({ type: "image_url", image_url: { url } });
    }
    if (data.photo_urls.length === 0) {
      content.push({ type: "text", text: "Aucune photo fournie — réponds photo_match: 'unverified'." });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`AI gateway ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = json.choices?.[0]?.message?.content ?? "{}";
    let parsed: Partial<EstimateResult> = {};
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }

    return {
      suggested_price_min: Number(parsed.suggested_price_min ?? 0),
      suggested_price_max: Number(parsed.suggested_price_max ?? 0),
      estimated_impressions_per_day: Number(parsed.estimated_impressions_per_day ?? 0),
      photo_match: (parsed.photo_match as EstimateResult["photo_match"]) ?? "unverified",
      photo_notes: String(parsed.photo_notes ?? ""),
      condition_alert: parsed.condition_alert ? String(parsed.condition_alert) : null,
      recommendation: String(parsed.recommendation ?? ""),
    };
  });
