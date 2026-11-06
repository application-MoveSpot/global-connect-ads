import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const HS_TOKEN = Deno.env.get("HUBSPOT_PRIVATE_APP_TOKEN")!;
const HS_BASE = "https://api.hubapi.com";

interface SyncContactRequest {
  user_id: string;
  event?: "upsert" | "delete";
}

async function hsRequest(path: string, method: string, body?: unknown) {
  const res = await fetch(`${HS_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${HS_TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`HubSpot ${method} ${path}: ${JSON.stringify(data)}`);
  return data;
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
    .select("full_name, phone, company, city")
    .eq("user_id", body.user_id)
    .maybeSingle();

  const { data: ownerProfile } = !advProfile
    ? await supabase
        .from("owner_profiles")
        .select("full_name, phone, company, city")
        .eq("user_id", body.user_id)
        .maybeSingle()
    : { data: null };

  const profile = advProfile ?? ownerProfile;
  const nameParts = (profile?.full_name ?? "").trim().split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const properties: Record<string, string> = {
    email: user.email,
    firstname: firstName,
    lastname: lastName,
    phone: profile?.phone ?? "",
    company: profile?.company ?? "",
    city: profile?.city ?? "",
    movespot_user_id: body.user_id,
  };

  // Chercher l'ID HubSpot existant dans notre log
  const { data: syncLog } = await supabase
    .from("hs_sync_log")
    .select("hubspot_id")
    .eq("object_type", "contact")
    .eq("supabase_id", body.user_id)
    .maybeSingle();

  let hubspotId = syncLog?.hubspot_id ?? null;
  let syncStatus = "ok";
  let errorMessage: string | null = null;

  try {
    if (hubspotId) {
      await hsRequest(`/crm/v3/objects/contacts/${hubspotId}`, "PATCH", { properties });
    } else {
      try {
        const created = await hsRequest("/crm/v3/objects/contacts", "POST", { properties });
        hubspotId = created.id;
      } catch {
        // Contact peut déjà exister — rechercher par email
        const search = await hsRequest("/crm/v3/objects/contacts/search", "POST", {
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: user.email }] }],
          limit: 1,
        });
        if (search.results?.length > 0) {
          hubspotId = search.results[0].id;
          await hsRequest(`/crm/v3/objects/contacts/${hubspotId}`, "PATCH", { properties });
        } else {
          throw new Error(`contact creation failed and email search returned nothing`);
        }
      }
    }
  } catch (err) {
    syncStatus = "error";
    errorMessage = String(err);
    console.error(`[hs-sync-contact] user=${body.user_id}`, err);
  }

  await supabase
    .from("hs_sync_log")
    .upsert(
      {
        object_type: "contact",
        supabase_id: body.user_id,
        hubspot_id: hubspotId,
        sync_status: syncStatus,
        error_message: errorMessage,
        synced_at: syncStatus === "ok" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "object_type,supabase_id" }
    )
    .catch(() => null);

  console.log(`[hs-sync-contact] user=${body.user_id} hs_id=${hubspotId} status=${syncStatus}`);

  return new Response(
    JSON.stringify({ ok: syncStatus === "ok", hubspot_id: hubspotId, sync_status: syncStatus }),
    { headers: { "Content-Type": "application/json" } }
  );
});
