import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // This function is called by pg_net trigger — uses service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = (await req.json()) as {
      message_id: string;
      content: string;
      sender_id: string;
      conversation_id: string;
    };

    const { message_id, content, sender_id, conversation_id } = body;

    if (!message_id || !content) {
      return new Response(JSON.stringify({ error: "message_id and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 128,
      system: [
        {
          type: "text",
          text: `Tu modères des messages dans une plateforme B2B de publicité mobile entre annonceurs et propriétaires de véhicules.
Analyse le message et retourne UNIQUEMENT un objet JSON:
{"intent":"commercial|inquiry|complaint|spam|harassment|inappropriate|normal","severity":0.0,"flags":[],"suggested_action":null}
- intent: intention principale du message
- severity: score 0.0 (normal) à 1.0 (très problématique)
- flags: liste vide [] ou contenant "spam", "harassment", "off_topic", "personal_data", "price_manipulation"
- suggested_action: null | "warn_user" | "hide_message" | "notify_admin"
  - null si severity < 0.4
  - "warn_user" si 0.4 <= severity < 0.7
  - "hide_message" si 0.7 <= severity < 0.8
  - "notify_admin" si severity >= 0.8`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Modère ce message: "${content}"`,
        },
      ],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    let moderation = {
      intent: "normal",
      severity: 0.0,
      flags: [] as string[],
      suggested_action: null as string | null,
    };

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as typeof moderation;
      moderation = parsed;
    }

    // Update message with moderation data
    await supabase
      .from("messages")
      .update({
        moderation: {
          ...moderation,
          model: "claude-haiku-5-5",
          moderated_at: new Date().toISOString(),
        },
      })
      .eq("id", message_id);

    // Insert alert if severity high
    if (moderation.severity >= 0.8) {
      await supabase.from("moderation_alerts").insert({
        message_id,
        conversation_id,
        sender_id,
        intent: moderation.intent,
        severity: moderation.severity,
        flags: moderation.flags,
        suggested_action: moderation.suggested_action,
        reviewed: false,
        created_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({ message_id, moderation }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-moderate-message error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
