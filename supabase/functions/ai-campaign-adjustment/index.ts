import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CalendarCampaign = {
  brief_id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: string;
  sector: string;
  city: string;
  budget: number;
  vehicle_types: string[];
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

    const { campaigns, analysis_date } = (await req.json()) as {
      campaigns: CalendarCampaign[];
      analysis_date: string;
    };

    if (!campaigns?.length) {
      return new Response(JSON.stringify({ alerts: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const calendar = campaigns
      .map(
        (c) =>
          `[${c.brief_id}] "${c.title}" | ${c.status} | ${c.start_date}→${c.end_date} | ${c.sector} | ${c.city} | ${c.budget}€ | ${c.vehicle_types.join(",")}`,
      )
      .join("\n");

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: `Tu analyses le planning calendaire de campagnes publicitaires mobiles et détectes conflits et opportunités.
Retourne UNIQUEMENT un objet JSON :
{
  "alerts": [
    {
      "brief_id": "uuid",
      "type": "conflict|opportunity|extension|overlap",
      "priority": "high|medium|low",
      "title": "Titre court (max 50 chars)",
      "message": "Explication en 1-2 phrases",
      "action": {
        "label": "Libellé bouton (max 30 chars)",
        "new_start_date": null,
        "new_end_date": null,
        "extend_days": null
      }
    }
  ]
}
- conflict: chevauchement cibles/zones même période
- opportunity: période favorable non exploitée (événement, saisonnalité FR)
- extension: campagne qui se termine avant le pic de performance
- overlap: deux campagnes identiques simultanées du même annonceur
- Ne génère une alerte que si elle apporte une valeur réelle et actionnable
- Max 5 alertes par analyse, triées par priorité décroissante`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Date d'analyse: ${analysis_date}
Campagnes actives et planifiées (${campaigns.length}):
${calendar}`,
        },
      ],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return new Response(JSON.stringify({ alerts: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-campaign-adjustment error:", e);
    return new Response(JSON.stringify({ alerts: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
