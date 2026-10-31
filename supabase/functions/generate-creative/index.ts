import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AD_FORMAT_TO_IMAGE_SIZE: Record<string, string> = {
  covering_total: "landscape_16_9",
  demi_covering:  "landscape_4_3",
  stickers:       "square_hd",
  affiche:        "portrait_4_3",
  boxled:         "landscape_16_9",
};

const VEHICLE_TYPE_HINTS: Record<string, string> = {
  taxi:            "on the side panel of a yellow taxi cab in an urban street",
  van:             "on the side of a white cargo van parked in a city",
  voiture:         "on the door of a car in a busy city street",
  camion_led:      "on a large LED digital billboard truck",
  food_truck:      "on the side of a food truck at an outdoor market",
  scooter:         "on a delivery scooter in an urban environment",
  velo_cargo:      "on the cargo box of a cargo bicycle",
  triporteur:      "on a cargo tricycle in a pedestrian zone",
  sac_a_dos_lcd:   "on a wearable LCD backpack screen in a crowd",
  sac_a_dos_affiche: "on a large poster backpack worn in a shopping area",
};

function buildImagePrompt(
  title: string,
  description: string,
  vehicleTypes: string[],
  adFormat: string,
): string {
  const vehicleHint =
    vehicleTypes.length > 0
      ? VEHICLE_TYPE_HINTS[vehicleTypes[0]] ?? "on a vehicle advertisement panel"
      : "on a vehicle advertisement panel";

  const formatHint =
    adFormat === "boxled"
      ? "vibrant digital display, high contrast"
      : adFormat === "stickers"
        ? "clean sticker design, bold colors"
        : "professional vehicle wrap design";

  return [
    `High-quality outdoor advertising visual for: "${title}".`,
    description ? `Campaign concept: ${description.slice(0, 200)}.` : "",
    `Displayed ${vehicleHint}.`,
    `Style: ${formatHint}, photorealistic render, no text overlays, clean white background elements, print-ready quality.`,
    "Do not include any logos, people's faces, or offensive content.",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildJinglePrompt(title: string, description: string): string {
  return `Upbeat, energetic advertising jingle sound for a brand called "${title}". ${
    description ? description.slice(0, 150) + "." : ""
  } Clean, professional, radio-ready, 20-25 seconds, no vocals.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      type,
      title,
      description,
      vehicleTypes = [],
      adFormat = "covering_total",
      briefId,
      prompt: customPrompt,
    } = await req.json();

    if (!["image", "jingle", "voiceover"].includes(type)) {
      return new Response(JSON.stringify({ error: "type must be 'image' or 'jingle'" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "image") {
      const falApiKey = Deno.env.get("FAL_API_KEY");
      if (!falApiKey) {
        return new Response(
          JSON.stringify({ error: "FAL_API_KEY not configured" }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const imagePrompt = customPrompt || buildImagePrompt(title, description, vehicleTypes, adFormat);
      const imageSize = AD_FORMAT_TO_IMAGE_SIZE[adFormat] ?? "landscape_16_9";

      const falRes = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          Authorization: `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: imagePrompt,
          image_size: imageSize,
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (!falRes.ok) {
        const err = await falRes.text();
        console.error("fal.ai error:", err);
        return new Response(
          JSON.stringify({ error: `fal.ai error: ${falRes.status}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const falData = await falRes.json();
      const imageUrl: string = falData.images?.[0]?.url;
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: "No image returned from fal.ai" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Download and store in Supabase Storage
      const imgRes = await fetch(imageUrl);
      const imgBuffer = await imgRes.arrayBuffer();
      const storagePath = `${user.id}/creative-ai/${Date.now()}.jpg`;
      await supabase.storage
        .from("campaign-creatives")
        .upload(storagePath, imgBuffer, { contentType: "image/jpeg", upsert: false });

      const { data: pub } = supabase.storage
        .from("campaign-creatives")
        .getPublicUrl(storagePath);

      await supabase.from("creative_assets").insert({
        advertiser_id: user.id,
        brief_id: briefId ?? null,
        type: "image",
        provider: "flux1",
        url: pub.publicUrl,
        storage_path: storagePath,
        prompt: imagePrompt,
        ad_format: adFormat,
        vehicle_types: vehicleTypes,
        cost_cents: 1,
      });

      return new Response(
        JSON.stringify({ url: pub.publicUrl, storage_path: storagePath, prompt: imagePrompt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // type === 'jingle'
    const elApiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!elApiKey) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const jinglePrompt = customPrompt || buildJinglePrompt(title, description);

    const elRes = await fetch("https://api.elevenlabs.io/v1/sound-generation", {
      method: "POST",
      headers: {
        "xi-api-key": elApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: jinglePrompt,
        duration_seconds: 22,
        prompt_influence: 0.3,
      }),
    });

    if (!elRes.ok) {
      const err = await elRes.text();
      console.error("ElevenLabs error:", err);
      return new Response(
        JSON.stringify({ error: `ElevenLabs error: ${elRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const audioBuffer = await elRes.arrayBuffer();
    const storagePath = `${user.id}/creative-ai/${Date.now()}.mp3`;
    await supabase.storage
      .from("campaign-creatives")
      .upload(storagePath, audioBuffer, { contentType: "audio/mpeg", upsert: false });

    const { data: pub } = supabase.storage
      .from("campaign-creatives")
      .getPublicUrl(storagePath);

    await supabase.from("creative_assets").insert({
      advertiser_id: user.id,
      brief_id: briefId ?? null,
      type: "jingle",
      provider: "elevenlabs",
      url: pub.publicUrl,
      storage_path: storagePath,
      prompt: jinglePrompt,
      ad_format: adFormat,
      vehicle_types: vehicleTypes,
      cost_cents: 10,
    });

    return new Response(
      JSON.stringify({ url: pub.publicUrl, storage_path: storagePath, prompt: jinglePrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-creative error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
