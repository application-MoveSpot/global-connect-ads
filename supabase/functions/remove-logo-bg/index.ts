import Replicate from "npm:replicate@^0.32.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Check cache in storage
    const cacheKey = btoa(logoUrl).replace(/[^a-z0-9]/gi, "").slice(0, 48) + ".png";
    const cachePath = `covering-processed/${cacheKey}`;

    const { data: existingFile } = await supabase.storage
      .from("logos")
      .getPublicUrl(cachePath);

    // Try to fetch the cached file to verify it exists
    const headRes = await fetch(existingFile.publicUrl, { method: "HEAD" });
    if (headRes.ok) {
      return new Response(
        JSON.stringify({ processedUrl: existingFile.publicUrl, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call Replicate remove-bg
    const replicate = new Replicate({
      auth: Deno.env.get("REPLICATE_API_TOKEN")!,
    });

    const output = await replicate.run(
      "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
      { input: { image: logoUrl } },
    ) as string;

    // Download the processed PNG
    const imgResponse = await fetch(output);
    const imgBuffer = await imgResponse.arrayBuffer();

    // Store in Supabase storage for cache
    await supabase.storage
      .from("logos")
      .upload(cachePath, imgBuffer, {
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
