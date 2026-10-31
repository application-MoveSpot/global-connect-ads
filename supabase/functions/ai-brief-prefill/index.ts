import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un assistant spécialisé dans l'extraction de données structurées pour des campagnes de publicité mobile sur véhicules (taxi, van, scooter, food_truck).

À partir d'une description en langage naturel, extrais les informations et retourne UNIQUEMENT un objet JSON valide (sans markdown, sans balises, sans commentaires).

Règles :
- title : titre court et accrocheur (max 60 caractères)
- description : résumé en 1-2 phrases de la campagne
- duration_weeks : nombre entier ≥ 1 (estimer 4 semaines si non précisé)
- city : ville principale en français ("France" si non précisée)
- budget : montant en euros, entier ≥ 500 (500 si non précisé ou inférieur)
- vehicle_type : le plus adapté parmi "taxi" | "van" | "scooter" | "food_truck"
  • taxi → campagnes notoriété urbaine, services, apps mobiles
  • van → retail, artisanat, B2B, grandes surfaces
  • scooter → cibles jeunes, livraison, zones denses
  • food_truck → restauration, événements, marchés
- audience : cible marketing courte (max 40 caractères)

Format de réponse strict (JSON uniquement) :
{"title":"...","description":"...","duration_weeks":3,"city":"...","budget":2000,"vehicle_type":"taxi","audience":"..."}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { prompt } = (await req.json()) as { prompt: string };
    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt.trim() }],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();

    // Extract JSON robustly (strip any accidental markdown fences)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");

    const parsed = JSON.parse(jsonMatch[0]) as {
      title: string;
      description: string;
      duration_weeks: number;
      city: string;
      budget: number;
      vehicle_type: "taxi" | "van" | "scooter" | "food_truck";
      audience: string;
    };

    // Sanitise numeric fields
    parsed.budget = Math.max(500, Math.round(Number(parsed.budget) || 500));
    parsed.duration_weeks = Math.max(1, Math.round(Number(parsed.duration_weeks) || 4));

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-brief-prefill error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
