import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PredictorInput = {
  start_date: string;
  duration_days: number;
  budget: number;
  sector: string;
  city: string;
  vehicle_count_estimate?: number;
  zone_type?: "urban_center" | "suburban" | "highway" | "mixed";
  competitor_pressure?: "low" | "medium" | "high";
  past_campaigns_avg_cpm?: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = (await req.json()) as PredictorInput;

    if (!input.start_date || !input.duration_days || !input.budget || !input.sector || !input.city) {
      return new Response(
        JSON.stringify({ error: "start_date, duration_days, budget, sector and city are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const endDate = new Date(input.start_date);
    endDate.setDate(endDate.getDate() + input.duration_days);

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      system: [
        {
          type: "text",
          text: `Tu es un modèle prédictif de performance pour des campagnes de publicité mobile sur véhicules en France.
Retourne UNIQUEMENT un objet JSON :
{
  "impressions_estimate": { "low": 0, "mid": 0, "high": 0 },
  "cpm_estimate": 0.0,
  "engagement_rate": 0.0,
  "roi_score": 0,
  "confidence": 0,
  "daily_breakdown": [
    { "day": "lun", "impressions_ratio": 1.0 },
    { "day": "mar", "impressions_ratio": 1.0 },
    { "day": "mer", "impressions_ratio": 1.0 },
    { "day": "jeu", "impressions_ratio": 1.0 },
    { "day": "ven", "impressions_ratio": 1.0 },
    { "day": "sam", "impressions_ratio": 1.0 },
    { "day": "dim", "impressions_ratio": 1.0 }
  ],
  "key_factors": ["facteur 1", "facteur 2"],
  "risk_flags": [],
  "recommendation": "GO|ADJUST|NO-GO",
  "recommendation_reason": "1 phrase"
}
- impressions_estimate : estimations basse/médiane/haute sur la durée totale
- cpm_estimate : coût pour mille impressions estimé en euros
- engagement_rate : taux d'interaction prédit (0.0 à 1.0)
- roi_score : composite 0-100
- confidence : fiabilité de la prévision 0-100
- daily_breakdown : ratio d'impressions par jour de semaine (1.0 = baseline lundi)
- recommendation : GO si roi_score > 60, ADJUST si 40-60, NO-GO si < 40`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Paramètres de la campagne :
- Secteur: ${input.sector}
- Ville: ${input.city}
- Période: ${input.start_date} → ${endDate.toISOString().slice(0, 10)} (${input.duration_days} jours)
- Budget total: ${input.budget}€
- Zone: ${input.zone_type ?? "mixed"}
- Véhicules estimés: ${input.vehicle_count_estimate ?? "non précisé"}
- Pression concurrentielle: ${input.competitor_pressure ?? "medium"}
- CPM historique moyen: ${input.past_campaigns_avg_cpm ? `${input.past_campaigns_avg_cpm}€` : "non disponible"}`,
        },
      ],
    });

    // Extract text block only — skip the thinking block
    const textBlock = message.content.find((b) => b.type === "text") as
      | { type: string; text: string }
      | undefined;
    if (!textBlock) throw new Error("No text block in response");

    const jsonMatch = textBlock.text.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Parse error — no JSON in response");

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-campaign-predictor error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
