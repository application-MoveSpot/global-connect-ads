import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface MatchRequest {
  brief_id: string;
  max_results?: number;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: MatchRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const { brief_id, max_results = 20 } = body;
  if (!brief_id) {
    return new Response("Missing brief_id", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Call the PostGIS RPC
  const { data: matches, error } = await supabase.rpc("pm_find_matching_vehicles", {
    p_brief_id: brief_id,
    p_max_results: max_results,
  });

  if (error) {
    console.error("[pm-matching]", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[pm-matching] brief=${brief_id} found=${matches?.length ?? 0} matches`);

  return new Response(JSON.stringify({ matches: matches ?? [] }), {
    headers: { "Content-Type": "application/json" },
  });
});
