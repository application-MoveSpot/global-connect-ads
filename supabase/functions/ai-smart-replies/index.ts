import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Message = {
  id: string;
  body: string;
  sender_role: "advertiser" | "owner";
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

    const { brief_id, proposal_id, my_role, last_message_id } = (await req.json()) as {
      brief_id: string;
      proposal_id?: string | null;
      my_role: "advertiser" | "owner";
      last_message_id?: string;
    };

    if (!brief_id || !my_role) {
      return new Response(JSON.stringify({ error: "brief_id and my_role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let q = supabase
      .from("messages")
      .select("id, body, sender_role")
      .eq("brief_id", brief_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (proposal_id) q = q.eq("proposal_id", proposal_id);

    const { data: messages } = await q;
    const msgList = ((messages ?? []) as Message[]).reverse();

    if (msgList.length === 0) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lastMsg = msgList[msgList.length - 1];
    // Only suggest replies when the last message is from the other party
    if (lastMsg.sender_role === my_role) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const myLabel = my_role === "advertiser" ? "Annonceur" : "Propriétaire";
    const otherLabel = my_role === "advertiser" ? "Propriétaire" : "Annonceur";

    const transcript = msgList
      .map((m) => {
        const role = m.sender_role === my_role ? myLabel : otherLabel;
        return `[${role}]: ${m.body}`;
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
- Variées: une affirmative, une question, une proposition de compromis
- Adaptées au contexte et au rôle qui répond (${myLabel})`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Dernier message de l'interlocuteur: "${lastMsg.body}"\n\nContexte:\n${transcript}`,
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
