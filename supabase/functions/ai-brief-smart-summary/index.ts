import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cache TTL: 24 hours
const TTL_HOURS = 24;

type Proposal = {
  id: string;
  status: string;
  vehicle_type?: string;
  price?: number;
  owner_name?: string;
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brief_id } = (await req.json()) as { brief_id: string };
    if (!brief_id) {
      return new Response(JSON.stringify({ error: "brief_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch brief metadata
    const { data: brief } = await supabase
      .from("advertiser_briefs")
      .select("id, title, status, start_date, budget, advertiser_id")
      .eq("id", brief_id)
      .eq("advertiser_id", user.id)
      .maybeSingle();

    if (!brief) {
      return new Response(JSON.stringify({ error: "Brief not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch proposals
    const { data: proposals } = await supabase
      .from("brief_proposals")
      .select("id, status, vehicle_type, price, owner_name")
      .eq("brief_id", brief_id);

    const proposalList = (proposals ?? []) as Proposal[];
    const total = proposalList.length;
    const pending = proposalList.filter((p) => p.status === "pending").length;
    const accepted = proposalList.filter((p) => p.status === "accepted").length;

    let summaryText: string;
    let actionRequired = false;

    if (total === 0) {
      summaryText = "Aucune proposition reçue pour l'instant.";
    } else {
      // For briefs with proposals, call Claude Haiku for a smart summary
      const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

      const proposalSummary = proposalList
        .slice(0, 10) // Limit context size
        .map(
          (p, i) =>
            `Proposition ${i + 1}: status=${p.status}, véhicule=${p.vehicle_type ?? "?"}` +
            (p.price ? `, prix=${p.price}€` : ""),
        )
        .join("\n");

      const message = await anthropic.messages.create({
        model: "claude-haiku-5-5",
        max_tokens: 128,
        system: `Tu génères des résumés ultra-courts (max 80 caractères) pour des briefs publicitaires mobiles.
Retourne UNIQUEMENT un objet JSON: {"summary":"...","action_required":true/false}
- summary: phrase courte en français, factuelle, orientée action si nécessaire
- action_required: true si des propositions "pending" attendent une réponse de l'annonceur`,
        messages: [
          {
            role: "user",
            content: `Brief: "${brief.title}" (${brief.status})
Total propositions: ${total} | En attente: ${pending} | Acceptées: ${accepted}
${proposalSummary}`,
          },
        ],
      });

      const rawText = (message.content[0] as { type: string; text: string }).text.trim();
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as { summary: string; action_required: boolean };
        summaryText = parsed.summary;
        actionRequired = parsed.action_required;
      } else {
        // Fallback to deterministic summary
        summaryText =
          pending > 0
            ? `${total} proposition${total > 1 ? "s" : ""} · ${pending} en attente de réponse`
            : `${total} proposition${total > 1 ? "s" : ""} · ${accepted} acceptée${accepted > 1 ? "s" : ""}`;
        actionRequired = pending > 0;
      }
    }

    // Upsert into cache table
    const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString();
    await supabase.from("ai_brief_summaries").upsert(
      {
        brief_id,
        advertiser_id: user.id,
        summary_text: summaryText,
        action_required: actionRequired,
        proposal_count: total,
        model: "claude-haiku-5-5",
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "brief_id" },
    );

    return new Response(
      JSON.stringify({
        brief_id,
        summary_text: summaryText,
        action_required: actionRequired,
        generated_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-brief-smart-summary error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
