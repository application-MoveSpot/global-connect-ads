import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore — Supabase.ai est injecté dans le runtime Edge Functions.
declare const Supabase: {
  ai: {
    Session: new (model: string) => {
      run: (input: string, opts?: object) => Promise<Float32Array>;
    };
  };
};

const session = new Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  // Protégé : nécessite le service_role key en Bearer token
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!serviceKey || token !== serviceKey) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey,
    { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
  );

  // Récupère tous les prestataires approuvés sans embedding
  const { data: providers, error: fetchError } = await supabase
    .from("provider_profiles")
    .select("user_id, company, full_name, description, services, coverage_areas")
    .eq("status", "approved")
    .is("embedding", null);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!providers || providers.length === 0) {
    return new Response(
      JSON.stringify({ message: "Aucun prestataire à traiter", processed: 0 }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  let processed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const provider of providers) {
    try {
      // Concatène les champs les plus pertinents pour la recherche sémantique
      const text = [
        provider.company || provider.full_name,
        provider.description,
        (provider.services as string[] | null)?.join(", "),
        (provider.coverage_areas as string[] | null)?.join(", "),
      ]
        .filter(Boolean)
        .join(". ")
        .slice(0, 512);

      const embedding = await session.run(text, { mean_pool: true, normalize: true });

      const { error: updateError } = await supabase
        .from("provider_profiles")
        .update({ embedding: Array.from(embedding) })
        .eq("user_id", provider.user_id);

      if (updateError) {
        failed++;
        errors.push(`${provider.user_id}: ${updateError.message}`);
      } else {
        processed++;
      }
    } catch (err) {
      failed++;
      errors.push(`${provider.user_id}: ${String(err)}`);
    }
  }

  return new Response(
    JSON.stringify({
      message: "Backfill terminé",
      total: providers.length,
      processed,
      failed,
      ...(errors.length > 0 && { errors }),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
