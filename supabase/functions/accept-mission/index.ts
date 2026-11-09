/**
 * accept-mission — Edge Function
 *
 * Acceptation atomique d'une mission distribuée (statut 'dispatched') par un poseur.
 * Utilise une fonction DB avec verrou pessimiste pour éviter les doubles-acceptations.
 *
 * Request body: { mission_id: string }
 * Auth: JWT poseur authentifié
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL     = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY         = Deno.env.get("SUPABASE_ANON_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // ── Auth JWT poseur ────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { mission_id: string };
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  const { mission_id } = body;
  if (!mission_id) return json({ error: "mission_id is required" }, 422);

  // ── Acceptation atomique via fonction DB ──────────────────────────────────
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: result, error: rpcErr } = await admin.rpc("accept_dispatched_mission", {
    p_mission_id:    mission_id,
    p_installer_uid: user.id,
  });

  if (rpcErr) {
    console.error("accept_dispatched_mission RPC error:", rpcErr);
    return json({ error: "Database error", details: rpcErr.message }, 500);
  }

  const outcome = result as { ok: boolean; reason?: string; status?: string };

  if (!outcome.ok) {
    const status = outcome.reason === "mission_not_found" ? 404
                 : outcome.reason === "not_invited"       ? 403
                 : outcome.reason === "already_taken"     ? 409
                 : 422;
    return json({ error: outcome.reason, status: outcome.status }, status);
  }

  // ── Retourner la mission mise à jour ──────────────────────────────────────
  const { data: mission, error: fetchErr } = await admin
    .from("installation_missions")
    .select("*")
    .eq("id", mission_id)
    .single();

  if (fetchErr || !mission) {
    // L'acceptation a réussi même si la lecture échoue
    return json({ ok: true, mission_id });
  }

  return json({ ok: true, mission });
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
