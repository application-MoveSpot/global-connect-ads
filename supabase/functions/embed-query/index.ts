const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Modèle gte-small intégré à Supabase — gratuit, 384 dimensions, aucune clé externe requise.
// @ts-ignore — Supabase.ai est injecté dans le runtime Edge Functions.
declare const Supabase: { ai: { Session: new (model: string) => { run: (input: string, opts?: object) => Promise<Float32Array> } } };

const session = new Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const embedding = await session.run(text.trim().slice(0, 512), {
      mean_pool: true,
      normalize: true,
    });

    return new Response(JSON.stringify({ embedding: Array.from(embedding) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("embed-query error:", err);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
