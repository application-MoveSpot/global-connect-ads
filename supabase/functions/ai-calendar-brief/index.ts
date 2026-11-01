import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type BriefInput = {
  campaign_date: string;
  sector: string;
  city?: string;
  vehicle_preference?: string[];
  budget_hint?: number;
  extra_context?: string;
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

    const input = (await req.json()) as BriefInput;

    if (!input.campaign_date || !input.sector) {
      return new Response(JSON.stringify({ error: "campaign_date and sector are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const date = new Date(input.campaign_date);
    const month = date.toLocaleString("fr-FR", { month: "long" });
    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: `Tu génères des briefs publicitaires pour des campagnes mobiles (affichage sur véhicules : taxis, VTC, camionnettes) en France.
Retourne UNIQUEMENT un objet JSON :
{
  "title": "Titre court et accrocheur (max 60 chars)",
  "objective": "Objectif SMART en 1 phrase",
  "target_audience": "Cible démographique et comportementale",
  "vehicle_types": ["taxi","vtc"],
  "taglines": [
    { "text": "Accroche 1", "tone": "direct" },
    { "text": "Accroche 2", "tone": "emotionnel" },
    { "text": "Accroche 3", "tone": "humoristique" }
  ],
  "recommended_duration_days": 14,
  "budget_range": { "min": 500, "max": 2000 }
}
- Accroches : max 80 chars, sans jargon
- Adapte au secteur et à la période de l'année (mois fourni)
- vehicle_types parmi : taxi, vtc, camionnette`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Secteur: ${input.sector}
Date de lancement prévue: ${input.campaign_date} (${month})
Ville: ${input.city ?? "France entière"}
Types de véhicules souhaités: ${(input.vehicle_preference ?? []).join(", ") || "tous"}
Budget indicatif: ${input.budget_hint ? `${input.budget_hint}€` : "non précisé"}
${input.extra_context ? `Contexte additionnel: ${input.extra_context}` : ""}`,
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
    console.error("ai-calendar-brief error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
