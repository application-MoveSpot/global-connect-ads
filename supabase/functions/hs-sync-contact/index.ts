import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const HUBSPOT_API_KEY = Deno.env.get("HUBSPOT_API_KEY") ?? "";
const HUBSPOT_API = "https://api.hubapi.com";

interface SyncContactRequest {
  user_id: string;
  event?: "upsert" | "delete";
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    let body: SyncContactRequest;
    try { body = await req.json(); } catch { return new Response("Bad Request", { status: 400 }); }

    if (!body.user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!HUBSPOT_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: "HUBSPOT_API_KEY not set" }), { status: 503, headers: { "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get user email via auth.admin
    const { data: { user }, error: authErr } = await supabase.auth.admin.getUserById(body.user_id);
    if (authErr || !user?.email) {
      console.error(`[hs-sync-contact] user not found: ${body.user_id}`);
      return new Response(JSON.stringify({ error: "user not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }

    // Get profile (advertiser first, then owner)
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

    // Look up existing HubSpot contact ID (for upsert)
    let hubspotContactId = "";
    try {
      const { data: contactLog } = await supabase
        .from("hs_sync_log")
        .select("hubspot_id")
        .eq("object_type", "contact")
        .eq("supabase_id", body.user_id)
        .maybeSingle();
      hubspotContactId = (contactLog as { hubspot_id?: string } | null)?.hubspot_id ?? "";
    } catch { /* no contact log yet */ }

    // Build HubSpot contact properties — split full_name into first/last
    const fullName = profile?.full_name ?? "";
    const spaceIdx = fullName.indexOf(" ");
    const firstName = spaceIdx > 0 ? fullName.slice(0, spaceIdx) : fullName;
    const lastName = spaceIdx > 0 ? fullName.slice(spaceIdx + 1) : "";

    const contactProperties: Record<string, string> = {
      email: user.email,
    };
    if (firstName) contactProperties.firstname = firstName;
    if (lastName) contactProperties.lastname = lastName;
    if (profile?.phone) contactProperties.phone = profile.phone;
    if (profile?.company) contactProperties.company = profile.company;
    if (profile?.city) contactProperties.city = profile.city;

    // Mark sync as pending
    try {
      await supabase.from("hs_sync_log").upsert(
        { object_type: "contact", supabase_id: body.user_id, sync_status: "pending", updated_at: new Date().toISOString() },
        { onConflict: "object_type,supabase_id" }
      );
    } catch { /* ignore */ }

    const isCreate = !hubspotContactId;
    let hsRes: Response | null = null;

    try {
      if (hubspotContactId) {
        // Update existing contact (PATCH)
        hsRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts/${hubspotContactId}`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${HUBSPOT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: contactProperties }),
        });
      } else {
        // Create new contact (POST)
        hsRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${HUBSPOT_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ properties: contactProperties }),
        });
      }
    } catch (e) {
      console.error(`[hs-sync-contact] HubSpot fetch failed: ${e}`);
    }

    const hsOk = hsRes?.ok ?? false;
    let hsBodyText = "";
    try { hsBodyText = await (hsRes?.text() ?? ""); } catch {}

    let newContactId = hubspotContactId;

    if (isCreate && hsOk) {
      try {
        const created = JSON.parse(hsBodyText) as { id?: string };
        newContactId = created.id ?? "";
      } catch { /* can't parse response body */ }
    }

    // Update sync log with result
    try {
      const updateData: Record<string, unknown> = {
        sync_status: hsOk ? "ok" : "error",
        error_message: hsOk ? null : `HS ${hsRes?.status ?? "??"}: ${hsBodyText.slice(0, 200)}`,
        synced_at: hsOk ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      if (hsOk && newContactId) updateData.hubspot_id = newContactId;
      await supabase.from("hs_sync_log").update(updateData)
        .eq("object_type", "contact").eq("supabase_id", body.user_id);
    } catch { /* ignore */ }

    console.log(`[hs-sync-contact] done | user=${body.user_id} hs_ok=${hsOk} contact_id=${newContactId} action=${isCreate ? "created" : "updated"}`);
    return new Response(JSON.stringify({
      ok: hsOk,
      hubspot_contact_id: newContactId,
      action: isCreate ? "created" : "updated",
      hs_status: hsRes?.status ?? null,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (err) {
    console.error(`[hs-sync-contact] UNCAUGHT: ${err}`);
    return new Response(JSON.stringify({ error: "internal", detail: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
