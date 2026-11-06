import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MAKE_WEBHOOK_CONTACT = Deno.env.get("MAKE_WEBHOOK_CONTACT_URL")!;

interface SyncContactRequest {
  user_id: string;
  event?: "upsert" | "delete";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let body: SyncContactRequest;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (!body.user_id) {
    return new Response(
      JSON.stringify({ error: "user_id required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // Récupérer l'email via auth.admin
  const { data: { user }, error: authErr } = await supabase.auth.admin.getUserById(body.user_id);
  if (authErr || !user?.email) {
    console.error(`[hs-sync-contact] user not found: ${body.user_id}`);
    return new Response(
      JSON.stringify({ error: "user not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Récupérer le profil (annonceur en priorité, sinon propriétaire)
  const { data: advProfile } = await supabase
    .from("advertiser_profiles")
    .select("full_name, phone, company, city, siret, account_type")
    .eq("user_id", body.user_id)
    .maybeSingle();

  const { data: ownerProfile } = !advProfile
    ? await supabase
        .from("owner_profiles")
        .select("full_name, phone, company, city, siret")
        .eq("user_id", body.user_id)
        .maybeSingle()
    : { data: null };

  const profile = advProfile ?? ownerProfile;
  const role = advProfile ? "advertiser" : "owner";

  const payload = {
    event: body.event ?? "upsert",
    user_id: body.user_id,
    email: user.email,
    role,
    full_name: profile?.full_name ?? "",
    phone: profile?.phone ?? "",
    company: profile?.company ?? "",
    city: profile?.city ?? "",
    siret: profile?.siret ?? "",
    account_type: (advProfile as { account_type?: string } | null)?.account_type ?? "",
    supabase_url: SUPABASE_URL,
  };

  // Marquer pending dans le log
  await supabase
    .from("hs_sync_log")
    .upsert(
      { object_type: "contact", supabase_id: body.user_id, sync_status: "pending", updated_at: new Date().toISOString() },
      { onConflict: "object_type,supabase_id" }
    )
    .catch(() => null);

  // Envoyer au scénario Make (best-effort)
  if (MAKE_WEBHOOK_CONTACT) {
    const makeRes = await fetch(MAKE_WEBHOOK_CONTACT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);

    const makeOk = makeRes?.ok ?? false;
    await supabase
      .from("hs_sync_log")
      .update({
        sync_status: makeOk ? "ok" : "error",
        error_message: makeOk ? null : "Make webhook call failed",
        synced_at: makeOk ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("object_type", "contact")
      .eq("supabase_id", body.user_id)
      .catch(() => null);

    console.log(`[hs-sync-contact] user=${body.user_id} make_ok=${makeOk}`);
    return new Response(JSON.stringify({ ok: makeOk, forwarded_to: "make" }), { headers: { "Content-Type": "application/json" } });
  }

  console.warn(`[hs-sync-contact] MAKE_WEBHOOK_CONTACT_URL not configured`);
  return new Response(JSON.stringify({ ok: false, error: "MAKE_WEBHOOK_CONTACT_URL not set" }), { status: 503, headers: { "Content-Type": "application/json" } });
});
