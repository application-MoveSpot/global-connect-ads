import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ModerationResult = {
  intent: string;
  severity: number;
  flags: string[];
  suggested_action: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Called by pg_net trigger with service role — bypass JWT verification is off
    // so we rely on the bearer token being the project's service_role_key.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const {
      message_id,
      content,
      sender_id,
      brief_id,
      proposal_id,
    } = (await req.json()) as {
      message_id: string;
      content: string;
      sender_id: string;
      brief_id: string;
      proposal_id?: string | null;
    };

    if (!message_id || !content) {
      return new Response(JSON.stringify({ error: "message_id and content are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const aiMessage = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 128,
      system: [
        {
          type: "text",
          text: `Tu modères des messages dans une plateforme B2B de publicité mobile entre annonceurs et propriétaires de véhicules.
Analyse le message et retourne UNIQUEMENT un objet JSON:
{"intent":"commercial|inquiry|complaint|spam|harassment|inappropriate|normal","severity":0.0,"flags":[],"suggested_action":null}
- intent: intention principale du message
- severity: score de 0.0 (normal) à 1.0 (très problématique)
- flags: [] ou sous-ensemble de ["spam","harassment","off_topic","personal_data","price_manipulation"]
- suggested_action:
  - null          si severity < 0.4
  - "warn_user"   si 0.4 ≤ severity < 0.7
  - "hide_message" si 0.7 ≤ severity < 0.8
  - "notify_admin" si severity ≥ 0.8`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        { role: "user", content: `Modère ce message: "${content}"` },
      ],
    });

    const rawText = (aiMessage.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    let moderation: ModerationResult = {
      intent: "normal",
      severity: 0.0,
      flags: [],
      suggested_action: null,
    };

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<ModerationResult>;
      moderation = {
        intent: typeof parsed.intent === "string" ? parsed.intent : "normal",
        severity: Math.min(1.0, Math.max(0.0, Number(parsed.severity) || 0)),
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
        suggested_action: typeof parsed.suggested_action === "string"
          ? parsed.suggested_action
          : null,
      };
    }

    const moderationPayload = {
      ...moderation,
      model: "claude-haiku-5-5",
      moderated_at: new Date().toISOString(),
    };

    // Write moderation snapshot onto the message row (jsonb)
    await supabase
      .from("messages")
      .update({ moderation: moderationPayload })
      .eq("id", message_id);

    // Insert alert only for high-severity messages (severity ≥ 0.8)
    if (moderation.severity >= 0.8) {
      // conversation_id = proposal_id ?? brief_id — mirrors the cache-key convention
      const conversation_id = proposal_id ?? brief_id ?? null;

      await supabase.from("moderation_alerts").insert({
        message_id,
        conversation_id,
        sender_id,
        brief_id: brief_id ?? null,
        proposal_id: proposal_id ?? null,
        intent: moderation.intent,
        severity: moderation.severity,
        flags: moderation.flags,
        suggested_action: moderation.suggested_action,
        reviewed: false,
      });
    }

    return new Response(
      JSON.stringify({ message_id, moderation: moderationPayload }),
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
