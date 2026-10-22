import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HuggingFace RMBG-1.4 — free, state-of-the-art background removal
const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/briaai/RMBG-1.4";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { logoUrl } = await req.json();
    if (!logoUrl) {
      return new Response(JSON.stringify({ error: "logoUrl required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (logoUrl.startsWith("blob:")) {
      return new Response(JSON.stringify({ error: "blob URLs not supported server-side" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Cache key based on logo URL
    const cacheKey =
      btoa(logoUrl).replace(/[^a-z0-9]/gi, "").slice(0, 48) + ".png";
    const cachePath = `covering-processed/${cacheKey}`;

    // Return cached result if available
    const { data: existing } = supabase.storage
      .from("logos")
      .getPublicUrl(cachePath);
    const headRes = await fetch(existing.publicUrl, { method: "HEAD" });
    if (headRes.ok) {
      return new Response(
        JSON.stringify({ processedUrl: existing.publicUrl, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Download the source logo
    const logoRes = await fetch(logoUrl);
    if (!logoRes.ok) {
      throw new Error(`Failed to fetch logo: ${logoRes.status}`);
    }
    const logoBuffer = await logoRes.arrayBuffer();

    const hfToken = Deno.env.get("HUGGINGFACE_API_TOKEN");
    if (!hfToken) {
      return new Response(
        JSON.stringify({ error: "HUGGINGFACE_API_TOKEN not configured" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Call HuggingFace RMBG-1.4 (free inference API)
    const hfRes = await fetch(HF_MODEL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${hfToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: logoBuffer,
    });

    if (!hfRes.ok) {
      const errText = await hfRes.text();
      throw new Error(`HuggingFace error ${hfRes.status}: ${errText}`);
    }

    const processedBuffer = await hfRes.arrayBuffer();

    // Store in Supabase Storage for caching
    await supabase.storage.from("logos").upload(cachePath, processedBuffer, {
      contentType: "image/png",
      upsert: true,
    });

    const { data: publicData } = supabase.storage
      .from("logos")
      .getPublicUrl(cachePath);

    return new Response(
      JSON.stringify({ processedUrl: publicData.publicUrl, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("remove-logo-bg error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
