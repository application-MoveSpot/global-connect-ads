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

    const { message_id, message_text, target_lang } = (await req.json()) as {
      message_id: string;
      message_text: string;
      target_lang: "fr" | "en" | "ar";
    };

    if (!message_text || !target_lang) {
      return new Response(JSON.stringify({ error: "message_text and target_lang are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Permanent cache keyed by message_id + target_lang
    if (message_id) {
      const cacheKey = `${message_id}:${target_lang}`;
      const { data: cached } = await supabase
        .from("ai_translations")
        .select("translation, detected_lang")
        .eq("cache_key", cacheKey)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({
            translation: cached.translation,
            detected_lang: cached.detected_lang,
            cached: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const langLabels: Record<string, string> = {
      fr: "français",
      en: "anglais",
      ar: "arabe",
    };

    const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });

    const message = await anthropic.messages.create({
      model: "claude-haiku-5-5",
      max_tokens: 512,
      system: [
        {
          type: "text",
          text: `Tu es un traducteur spécialisé dans les communications professionnelles B2B.
Traduis le message fourni vers la langue cible et détecte la langue source.
Retourne UNIQUEMENT un objet JSON: {"translation":"...","detected_lang":"fr|en|ar|other"}
- Conserve le ton professionnel
- Ne traduis pas les noms propres ni les montants en devises
- detected_lang: code ISO de la langue source détectée`,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Traduis en ${langLabels[target_lang] ?? target_lang}:\n\n"${message_text}"`,
        },
      ],
    });

    const rawText = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);

    let translation = message_text;
    let detectedLang = "other";

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as {
        translation: string;
        detected_lang: string;
      };
      translation = parsed.translation;
      detectedLang = parsed.detected_lang;
    }

    // Store in permanent cache (if message_id provided)
    if (message_id) {
      const cacheKey = `${message_id}:${target_lang}`;
      // Use service role for write (via SUPABASE_SERVICE_ROLE_KEY if available, else anon)
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      );
      await adminClient.from("ai_translations").upsert(
        {
          cache_key: cacheKey,
          message_id,
          target_lang,
          translation,
          detected_lang: detectedLang,
          model: "claude-haiku-5-5",
          created_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );
    }

    return new Response(
      JSON.stringify({ translation, detected_lang: detectedLang, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-translate-message error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
