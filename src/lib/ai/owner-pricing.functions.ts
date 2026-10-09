import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit } from "@/lib/rateLimit.server";

const OwnerPricingInput = z.object({
  vehicleId: z.string().uuid(),
});

export type PricingRecommendation = {
  suggested: number; // €/jour
  min: number;
  max: number;
  rationale: string;
  factors: string[];
};

export const recommendVehiclePrice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof OwnerPricingInput>) => OwnerPricingInput.parse(d))
  .handler(async ({ data, context }): Promise<PricingRecommendation> => {
    assertRateLimit(`owner-pricing:${context.userId}`, { maxRequests: 30, windowMs: 60_000 });
    const { supabase, userId } = context;

    // Charger le véhicule (vérif propriétaire)
    const { data: ownerProfile } = await supabase
      .from("owner_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!ownerProfile) throw new Error("Profil propriétaire introuvable");

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("type, zones, km_per_day, surface_m2, condition, price_per_day")
      .eq("id", data.vehicleId)
      .eq("owner_id", ownerProfile.id)
      .maybeSingle();
    if (!vehicle) throw new Error("Véhicule introuvable ou accès refusé");

    // Statistiques de la plateforme : prix moyen pour ce type
    const { data: stats } = await supabase
      .from("vehicles")
      .select("price_per_day")
      .eq("type", vehicle.type)
      .eq("status", "approved");

    const prices = (stats ?? []).map((v: { price_per_day: number }) => Number(v.price_per_day)).filter((p: number) => p > 0);
    const avgPrice = prices.length ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : null;
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const prompt = `Tu es expert en tarification publicitaire mobile en France (véhicules publicitaires).

Données du véhicule :
- Type : ${vehicle.type}
- Zones : ${(vehicle.zones as string[] | null)?.join(", ") ?? "non renseignées"}
- Km/jour : ${vehicle.km_per_day ?? "non renseigné"}
- Surface m² : ${vehicle.surface_m2 ?? "non renseignée"}
- Condition : ${vehicle.condition ?? "non renseignée"}
- Prix actuel propriétaire : ${vehicle.price_per_day} €/jour

Données marché sur la plateforme pour ce type de véhicule :
- Nombre de véhicules similaires : ${prices.length}
- Prix moyen plateforme : ${avgPrice ?? "inconnu"} €/jour
- Fourchette : ${minPrice ?? "?"} – ${maxPrice ?? "?"} €/jour

Recommande un prix optimal en tenant compte de la visibilité, la concurrence et la valeur pour les annonceurs.
Tarifs de référence marché français : taxi/VTC 15-30€/j, van 25-50€/j, camion LED 80-200€/j.

Réponds UNIQUEMENT en JSON strict :
{
  "suggested": 28,
  "min": 20,
  "max": 40,
  "rationale": "Explication courte (max 120 chars) pourquoi ce prix",
  "factors": ["Facteur positif 1", "Facteur limitant 1"]
}`;

    const { text } = await generateText({ model, prompt, temperature: 0.2, maxOutputTokens: 250 });

    try {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as PricingRecommendation;
      return {
        suggested: Math.max(5, Number(parsed.suggested ?? 20)),
        min: Math.max(5, Number(parsed.min ?? 10)),
        max: Math.max(5, Number(parsed.max ?? 50)),
        rationale: String(parsed.rationale ?? "").slice(0, 200),
        factors: Array.isArray(parsed.factors) ? (parsed.factors as string[]).slice(0, 4) : [],
      };
    } catch {
      return { suggested: avgPrice ?? 20, min: minPrice ?? 10, max: maxPrice ?? 50, rationale: "Basé sur les prix de la plateforme.", factors: [] };
    }
  });
