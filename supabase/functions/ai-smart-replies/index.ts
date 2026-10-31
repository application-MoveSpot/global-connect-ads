import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Message = {
  id: string;
  content: string;
  sender_id: string;
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

    const { conversation_id, last_message_id } = (await req.json()) as {
      conversation_id: string;
      last_message_id?: string;
    };

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 10 messages for context
    const { data: messages } = await supabase
      .from("messages")
      .select("id, content, sender_id")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: false })
      .limit(10);

    const msgList = ((messages ?? []) as Message[]).reverse();

    if (msgList.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastMsg = msgList[msgList.length - 1];
    // If the last message is from the current user, no smart reply needed
    if (lastMsg.sender_id === user.id) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const transcript = msgList
      .map((m) => {
        const role = m.sender_id === user.id ? "Vous" : "Interlocuteur";
        return `[${role}]: ${m.content}`;
      })
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 128,
      system: [
        {
          type: "text",
          text: `Tu génères 3 suggestions de réponses courtes pour des négociations publicitaires entre annonceurs et propriétaires de véhicules.
Retourne UNIQUEMENT un objet JSON: {"suggestions":["réponse 1","réponse 2","réponse 3"]}
- Chaque suggestion: max 60 caractères, professionnelle, en français
- Variées: une affirmative, une demande d'info, une proposition de compromis
- Adaptées au contexte de la conversation`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Dernier message de l'interlocuteur: "${lastMsg.content}"\n\nContexte:\n${transcript}`,
        },
      ],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    let suggestions: string[] = [];
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { suggestions: string[] };
      suggestions = parsed.suggestions?.slice(0, 3) ?? [];
    }

    return new Response(
      JSON.stringify({ suggestions, last_message_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-smart-replies error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
