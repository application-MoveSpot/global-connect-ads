import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CampaignHistory = {
  start_date: string;
  end_date: string;
  budget: number;
  impressions: number;
  clicks: number;
  sector: string;
};

type SchedulingInput = {
  range_start: string;
  range_end: string;
  sector: string;
  campaign_history: CampaignHistory[];
  budget_hint?: number;
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

    const input = (await req.json()) as SchedulingInput;

    if (!input.range_start || !input.range_end || !input.sector) {
      return new Response(JSON.stringify({ error: "range_start, range_end and sector are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const historySummary = (input.campaign_history ?? [])
      .map((h) => {
        const ctr = h.impressions > 0 ? ((h.clicks / h.impressions) * 100).toFixed(2) : "0";
        return `[${h.start_date}→${h.end_date}] budget=${h.budget}€ impressions=${h.impressions} CTR=${ctr}%`;
      })
      .join("\n");

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: `Tu es un expert en planification de campagnes publicitaires mobiles (taxi, VTC, camionnettes) en France.
Analyse les données historiques et retourne UNIQUEMENT un objet JSON :
{
  "recommendations": [
    {
      "week_start": "YYYY-MM-DD",
      "score": 0,
      "tier": "optimal|good|average|avoid",
      "rationale": "1 phrase max",
      "predicted_reach_multiplier": 1.0
    }
  ],
  "best_window": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "reason": "..." },
  "warnings": []
}
- score : 0 (mauvais) à 100 (parfait)
- predicted_reach_multiplier : ratio vs performance moyenne (1.0 = baseline)
- tier optimal si score >= 80, good si >= 60, average si >= 40, sinon avoid
- Considère : saisonnalité, jours fériés FR, concurrence, météo, historique fourni
- Couvre chaque lundi du range fourni`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Secteur: ${input.sector}
Range d'analyse: ${input.range_start} → ${input.range_end}
Budget indicatif: ${input.budget_hint ? `${input.budget_hint}€` : "non précisé"}

Historique des campagnes (${(input.campaign_history ?? []).length} entrées):
${historySummary || "Aucun historique — base-toi sur la saisonnalité sectorielle française."}`,
        },
      ],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Parse error — no JSON in response");

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-smart-scheduling error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
