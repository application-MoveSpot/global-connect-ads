import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TTL_MINUTES = 15;

type Message = {
  id: string;
  body: string;
  sender_role: "advertiser" | "owner";
  created_at: string;
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { brief_id, proposal_id } = (await req.json()) as {
      brief_id: string;
      proposal_id?: string | null;
    };

    if (!brief_id) {
      return new Response(JSON.stringify({ error: "brief_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache key: proposal_id when available, else brief_id
    const cacheId = proposal_id ?? brief_id;

    // Check TTL cache
    const { data: cached } = await supabase
      .from("ai_conversation_summaries")
      .select("*")
      .eq("conversation_id", cacheId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return new Response(
        JSON.stringify({
          summary: cached.summary,
          status: cached.negotiation_status,
          action_required: cached.action_required,
          generated_at: cached.generated_at,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch last 30 messages for this thread
    let q = supabase
      .from("messages")
      .select("id, body, sender_role, created_at")
      .eq("brief_id", brief_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (proposal_id) q = q.eq("proposal_id", proposal_id);

    const { data: messages } = await q;
    const msgList = ((messages ?? []) as Message[]).reverse();

    if (msgList.length === 0) {
      return new Response(
        JSON.stringify({
          summary: "Aucun message dans cette conversation.",
          status: "stalled",
          action_required: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Determine my role from context
    const myRole = user.id ? "advertiser" : "owner";

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const transcript = msgList
      .map((m) => {
        const role = m.sender_role === "advertiser" ? "Annonceur" : "Propriétaire";
        return `[${role}]: ${m.body}`;
      })
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 256,
      system: [
        {
          type: "text",
          text: `Tu résumes des conversations de négociation entre annonceurs et propriétaires de véhicules pour des campagnes publicitaires mobiles.
Retourne UNIQUEMENT un objet JSON: {"summary":"...","status":"negotiating|agreed|stalled|closed","action_required":true/false}
- summary: 1-2 phrases en français, factuelle, orientée action (max 150 caractères)
- status: "negotiating" (en cours), "agreed" (accord trouvé), "stalled" (bloquée/silence), "closed" (terminée)
- action_required: true si l'annonceur doit répondre ou agir`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Résume cette conversation de négociation (${msgList.length} messages) :\n\n${transcript}`,
        },
      ],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    let summary = "Conversation en cours de négociation.";
    let negotiationStatus = "negotiating";
    let actionRequired = false;

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        summary: string;
        status: string;
        action_required: boolean;
      };
      summary = parsed.summary;
      negotiationStatus = parsed.status;
      actionRequired = parsed.action_required;
    }

    const expiresAt = new Date(Date.now() + TTL_MINUTES * 60 * 1000).toISOString();
    await supabase.from("ai_conversation_summaries").upsert(
      {
        conversation_id: cacheId,
        user_id: user.id,
        summary,
        negotiation_status: negotiationStatus,
        action_required: actionRequired,
        message_count: msgList.length,
        model: "claude-haiku-5-5",
        generated_at: new Date().toISOString(),
        expires_at: expiresAt,
      },
      { onConflict: "conversation_id" },
    );

    return new Response(
      JSON.stringify({
        summary,
        status: negotiationStatus,
        action_required: actionRequired,
        generated_at: new Date().toISOString(),
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-conversation-summary error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
