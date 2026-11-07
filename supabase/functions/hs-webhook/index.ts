import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface HsEvent {
  subscriptionType: string;
  objectType: string;
  objectId: number;
  propertyName?: string;
  propertyValue?: string;
  changeSource?: string;
  eventId?: number;
  occurredAt?: number;
}

const HS_STAGE_TO_PM: Record<string, string> = {
  closedwon: "completed",
  closedlost: "incident",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  let events: HsEvent[];
  try {
    const raw = await req.json();
    events = Array.isArray(raw) ? raw : [raw];
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const processed: string[] = [];

  for (const event of events) {
    const hsId = String(event.objectId);

    // Contact supprimé dans HubSpot
    if (event.subscriptionType === "contact.deletion") {
      await supabase
        .from("hs_sync_log")
        .update({ sync_status: "deleted", updated_at: new Date().toISOString() })
        .eq("object_type", "contact")
        .eq("hubspot_id", hsId)
        .catch(() => null);
      processed.push(`contact.deleted:${hsId}`);
      continue;
    }

    // Changement de stage d'un deal → répercuter dans Supabase
    if (event.subscriptionType === "deal.propertyChange" && event.propertyName === "dealstage") {
      const { data: syncLog } = await supabase
        .from("hs_sync_log")
        .select("supabase_id")
        .eq("object_type", "deal")
        .eq("hubspot_id", hsId)
        .maybeSingle();

      if (syncLog?.supabase_id && event.propertyValue) {
        const pmStatus = HS_STAGE_TO_PM[event.propertyValue];
        if (pmStatus) {
          await supabase
            .from("campaign_requests")
            .update({ pm_status: pmStatus, updated_at: new Date().toISOString() })
            .eq("id", syncLog.supabase_id)
            .catch(() => null);
          processed.push(`deal.stage:${hsId}→${event.propertyValue}→pm_status=${pmStatus}`);
        } else {
          processed.push(`deal.stage:${hsId}→${event.propertyValue} (no Supabase mapping)`);
        }
      }
      continue;
    }

    // Note des autres événements pour le log
    if (event.subscriptionType) {
      processed.push(`ignored:${event.subscriptionType}:${hsId}`);
    }
  }

  console.log(`[hs-webhook] events=${events.length} processed: ${processed.join(" | ") || "none"}`);

  return new Response(
    JSON.stringify({ ok: true, processed }),
    { headers: { "Content-Type": "application/json" } }
  );
});
