import { createFileRoute } from "@tanstack/react-router";
import { sendWebPushToUser } from "@/lib/notifications/push-send.server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Database Webhook → Web Push
 *
 * To activate: in the Supabase dashboard → Database → Webhooks, create a webhook for each
 * event below and point it to: https://<your-domain>/api/webhooks/supabase-push
 * Add the header: Authorization: Bearer <SUPABASE_WEBHOOK_SECRET>
 *
 * Supported triggers:
 *   - campaign_requests INSERT  → notify owner
 *   - campaign_requests UPDATE  → notify certified installers (status→approved), admins (installation_status→pending_approval)
 *   - brief_proposals   UPDATE  → notify owner (accepted/rejected)
 *   - payee_profiles    UPDATE  → notify chauffeur (certification)
 *   - vehicles          UPDATE  → notify owner (approved/rejected)
 */

const WEBHOOK_SECRET = process.env["SUPABASE_WEBHOOK_SECRET"];

async function getOwnerUserId(ownerId: string): Promise<string | null> {
  const db = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
  );
  const { data } = await db
    .from("owner_profiles" as never)
    .select("user_id")
    .eq("id" as never, ownerId)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

export const Route = createFileRoute("/api/webhooks/supabase-push")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Verify secret when configured
        if (WEBHOOK_SECRET) {
          const auth = request.headers.get("Authorization");
          if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const table = body.table as string;
        const type = body.type as string; // INSERT | UPDATE | DELETE
        const record = (body.record ?? {}) as Record<string, unknown>;
        const oldRecord = (body.old_record ?? {}) as Record<string, unknown>;

        try {
          if (table === "campaign_requests" && type === "INSERT") {
            // The campaign request stores vehicle_id; look up the owner
            const vehicleId = record.vehicle_id as string | undefined;
            if (vehicleId) {
              const db = createClient(
                process.env["SUPABASE_URL"]!,
                process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
              );
              const { data: v } = await db
                .from("vehicles" as never)
                .select("owner_id")
                .eq("id" as never, vehicleId)
                .maybeSingle();
              const ownerId = (v as { owner_id?: string } | null)?.owner_id;
              if (ownerId) {
                const userId = await getOwnerUserId(ownerId);
                if (userId) {
                  const company = record.company as string | undefined;
                  await sendWebPushToUser(userId, {
                    title: "Nouvelle demande de campagne",
                    body: company ? `${company} souhaite louer un espace publicitaire.` : undefined,
                    url: "/proprietaire",
                  });
                }
              }
            }
          }

          if (table === "campaign_requests" && type === "UPDATE") {
            const newStatus = record.status as string | undefined;
            const prevStatus = oldRecord.status as string | undefined;
            const db = createClient(
              process.env["SUPABASE_URL"]!,
              process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
            );

            // A campaign just got approved → new installation job for certified installers
            if (newStatus === "approved" && prevStatus !== "approved") {
              const { data: installers } = await db
                .from("payee_profiles" as never)
                .select("user_id")
                .in("kind" as never, ["installer", "both"])
                .eq("certification_status" as never, "certified");
              if (installers?.length) {
                await Promise.allSettled(
                  (installers as Array<{ user_id: string }>).map((p) =>
                    sendWebPushToUser(p.user_id, {
                      title: "Nouvelle mission disponible !",
                      body: "Une mission d'installation est disponible dans votre espace.",
                      url: "/chauffeur/espace",
                    })
                  )
                );
              }
            }

            // Installer submitted photos → notify admins
            const newInstallStatus = record.installation_status as string | undefined;
            const prevInstallStatus = oldRecord.installation_status as string | undefined;
            if (newInstallStatus === "pending_approval" && prevInstallStatus !== "pending_approval") {
              const { data: admins } = await db
                .from("user_roles" as never)
                .select("user_id")
                .eq("role" as never, "admin");
              if (admins?.length) {
                await Promise.allSettled(
                  (admins as Array<{ user_id: string }>).map((a) =>
                    sendWebPushToUser(a.user_id, {
                      title: "Photos à valider",
                      body: "Un installateur a soumis des photos d'installation.",
                      url: "/admin",
                    })
                  )
                );
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
                  await sendWebPushToUser(userId, {
                    title: newStatus === "accepted" ? "Proposition acceptée !" : "Proposition refusée",
                    body: newStatus === "accepted"
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
                await sendWebPushToUser(userId, {
                  title: newCertif === "certified" ? "Certification validée !" : "Certification refusée",
                  body: newCertif === "certified"
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
                  await sendWebPushToUser(userId, {
                    title: newStatus === "approved" ? "Véhicule approuvé !" : "Véhicule refusé",
                    body: name
                      ? (newStatus === "approved"
                          ? `${name} est maintenant visible par les annonceurs.`
                          : `${name} n'a pas été approuvé. Consultez les notes.`)
                      : undefined,
                    url: "/proprietaire",
                  });
                }
              }
            }
          }
        } catch {
          // Never let push errors break the webhook response
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
