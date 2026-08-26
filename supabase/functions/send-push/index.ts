import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:contact@movespot.fr";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected by Supabase
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type PushPayload = { title: string; body?: string; url?: string };

async function sendToUser(userId: string, payload: PushPayload) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const serialized = JSON.stringify({ ...payload, tag: "movespot" });

  await Promise.allSettled(
    subs.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          serialized,
        )
        .catch(async (err: { statusCode?: number }) => {
          // Remove expired subscriptions automatically
          if (err.statusCode === 410) {
            await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }),
    ),
  );
}

async function getOwnerUserId(ownerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("owner_profiles")
    .select("user_id")
    .eq("id", ownerId)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  try {
    // Direct push: { userId, title, body?, url? }
    if (typeof body.userId === "string" && typeof body.title === "string") {
      await sendToUser(body.userId, {
        title: body.title,
        body: body.body as string | undefined,
        url: body.url as string | undefined,
      });
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // DB Webhook format: { type, table, record, old_record }
    const table = body.table as string | undefined;
    const type = body.type as string | undefined;
    const record = (body.record ?? {}) as Record<string, unknown>;
    const oldRecord = (body.old_record ?? {}) as Record<string, unknown>;

    if (table === "campaign_requests" && type === "INSERT") {
      const vehicleId = record.vehicle_id as string | undefined;
      if (vehicleId) {
        const { data: v } = await supabase
          .from("vehicles")
          .select("owner_id")
          .eq("id", vehicleId)
          .maybeSingle();
        const ownerId = (v as { owner_id?: string } | null)?.owner_id;
        if (ownerId) {
          const userId = await getOwnerUserId(ownerId);
          if (userId) {
            const company = record.company as string | undefined;
            await sendToUser(userId, {
              title: "Nouvelle demande de campagne",
              body: company ? `${company} souhaite louer un espace publicitaire.` : undefined,
              url: "/proprietaire",
            });
          }
        }
      }
    }

    if (table === "brief_proposals" && type === "UPDATE") {
      const newStatus = record.status as string | undefined;
      const prevStatus = oldRecord.status as string | undefined;
      if (newStatus !== prevStatus && (newStatus === "accepted" || newStatus === "rejected")) {
        const ownerId = record.owner_id as string | undefined;
        if (ownerId) {
          const userId = await getOwnerUserId(ownerId);
          if (userId) {
            await sendToUser(userId, {
              title: newStatus === "accepted" ? "Proposition acceptée !" : "Proposition refusée",
              body:
                newStatus === "accepted"
                  ? "Un annonceur a accepté votre proposition."
                  : "Un annonceur a refusé votre proposition.",
              url: "/proprietaire/briefs",
            });
          }
        }
      }
    }

    if (table === "payee_profiles" && type === "UPDATE") {
      const newCertif = record.certification_status as string | undefined;
      const prevCertif = oldRecord.certification_status as string | undefined;
      if (newCertif !== prevCertif && (newCertif === "certified" || newCertif === "rejected")) {
        const userId = record.user_id as string | undefined;
        if (userId) {
          await sendToUser(userId, {
            title: newCertif === "certified" ? "Certification validée !" : "Certification refusée",
            body:
              newCertif === "certified"
                ? "Vous êtes maintenant certifié MoveSpot."
                : "Votre certification a été refusée. Consultez les notes.",
            url: "/chauffeur/espace",
          });
        }
      }
    }

    if (table === "vehicles" && type === "UPDATE") {
      const newStatus = record.status as string | undefined;
      const prevStatus = oldRecord.status as string | undefined;
      if (newStatus !== prevStatus && (newStatus === "approved" || newStatus === "rejected")) {
        const ownerId = record.owner_id as string | undefined;
        if (ownerId) {
          const userId = await getOwnerUserId(ownerId);
          if (userId) {
            const name = record.name as string | undefined;
            await sendToUser(userId, {
              title: newStatus === "approved" ? "Véhicule approuvé !" : "Véhicule refusé",
              body: name
                ? newStatus === "approved"
                  ? `${name} est maintenant visible par les annonceurs.`
                  : `${name} n'a pas été approuvé. Consultez les notes.`
                : undefined,
              url: "/proprietaire",
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("send-push error:", err);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
