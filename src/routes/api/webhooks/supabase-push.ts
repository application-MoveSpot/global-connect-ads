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
        // Reject all requests when secret is not configured (fail-closed)
        if (!WEBHOOK_SECRET) {
          return new Response("Webhook non configuré", { status: 503 });
        }
        const auth = request.headers.get("Authorization");
        if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
          return new Response("Unauthorized", { status: 401 });
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

            // Admin rejected photos → notify the installer
            if (newInstallStatus === "rejected" && prevInstallStatus !== "rejected") {
              const photos = record.installation_photos as Record<string, unknown> | null;
              const installerUserId = photos?.claimed_by as string | undefined;
              const notes = record.installation_notes as string | undefined;
              if (installerUserId) {
                await sendWebPushToUser(installerUserId, {
                  title: "⛔ Pose refusée — correction requise",
                  body: notes
                    ? `Motif : ${notes}`
                    : "Votre pose a été refusée. Consultez votre espace pour corriger.",
                  url: "/chauffeur/espace",
                });
              }
            }
          }

          if (table === "brief_proposals" && type === "INSERT") {
            // Notify the advertiser that an owner submitted a proposal on their brief
            const briefId = record.brief_id as string | undefined;
            const pricePerDay = record.price_per_day as number | undefined;
            const vehicleId = record.vehicle_id as string | undefined;
            if (briefId) {
              const db = createClient(
                process.env["SUPABASE_URL"]!,
                process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
              );
              // Load brief + advertiser profile in parallel
              const [briefRes, vehicleRes] = await Promise.allSettled([
                db
                  .from("advertiser_briefs" as never)
                  .select("user_id, title, start_date, zones")
                  .eq("id" as never, briefId)
                  .maybeSingle(),
                vehicleId
                  ? db
                      .from("vehicles" as never)
                      .select("owner_id, kind, name")
                      .eq("id" as never, vehicleId)
                      .maybeSingle()
                  : Promise.resolve({ data: null }),
              ]);

              const brief = briefRes.status === "fulfilled"
                ? (briefRes.value.data as { user_id?: string; title?: string; start_date?: string; zones?: string[] } | null)
                : null;
              const vehicle = vehicleRes.status === "fulfilled"
                ? (vehicleRes.value.data as { owner_id?: string; kind?: string; name?: string } | null)
                : null;

              if (brief?.user_id) {
                const [userRes, profileRes, ownerRes] = await Promise.allSettled([
                  db.auth.admin.getUserById(brief.user_id),
                  db
                    .from("advertiser_profiles" as never)
                    .select("full_name, account_type")
                    .eq("user_id" as never, brief.user_id)
                    .maybeSingle(),
                  vehicle?.owner_id
                    ? db
                        .from("owner_profiles" as never)
                        .select("full_name")
                        .eq("id" as never, vehicle.owner_id)
                        .maybeSingle()
                    : Promise.resolve({ data: null }),
                ]);

                const email = userRes.status === "fulfilled"
                  ? userRes.value.data?.user?.email
                  : undefined;
                const profile = profileRes.status === "fulfilled"
                  ? (profileRes.value.data as { full_name?: string; account_type?: string } | null)
                  : null;
                const ownerProfile = ownerRes.status === "fulfilled"
                  ? (ownerRes.value.data as { full_name?: string } | null)
                  : null;

                if (email) {
                  const isIndividual = profile?.account_type === "individual";
                  const briefUrl = `https://move-spot.com/annonceur/briefs/${briefId}`;
                  const { sendAppEmailSafe } = await import("@/lib/email/send.server");

                  const fmtDate = (d: string | null | undefined) =>
                    d ? new Date(d).toLocaleDateString("fr-FR") : undefined;

                  const daysUntilEvent = brief.start_date
                    ? Math.round((new Date(brief.start_date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000)
                    : undefined;

                  const priceLabel = pricePerDay != null
                    ? `${Number(pricePerDay).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} / jour`
                    : undefined;

                  const zoneLabel = brief.zones?.length ? brief.zones[0] : undefined;

                  if (isIndividual) {
                    const firstName = profile?.full_name?.split(" ")[0];
                    await sendAppEmailSafe({
                      templateName: "brief-proposal-received-individual",
                      recipientEmail: email,
                      templateData: {
                        firstName,
                        ownerName: ownerProfile?.full_name,
                        vehicleType: vehicle?.kind,
                        zone: zoneLabel,
                        proposedPrice: priceLabel,
                        startDate: fmtDate(brief.start_date),
                        daysUntilEvent,
                        dashboardUrl: briefUrl,
                      },
                    });
                  } else {
                    await sendAppEmailSafe({
                      templateName: "brief-proposal-received",
                      recipientEmail: email,
                      templateData: {
                        company: profile?.full_name,
                        spotName: brief.title,
                        ownerName: ownerProfile?.full_name,
                        vehicleCount: vehicle?.name ?? vehicle?.kind,
                        zone: zoneLabel,
                        proposedPrice: priceLabel,
                        startDate: fmtDate(brief.start_date),
                        dashboardUrl: briefUrl,
                      },
                    });
                  }
                }
              }
            }
          }

          if (table === "brief_proposals" && type === "UPDATE") {
            const newStatus = record.status as string | undefined;
            const prevStatus = oldRecord.status as string | undefined;
            if (newStatus !== prevStatus && (newStatus === "accepted" || newStatus === "rejected")) {
              const ownerId = record.owner_id as string | undefined;
              const briefId = record.brief_id as string | undefined;
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

                // Send email to the owner
                const db = createClient(
                  process.env["SUPABASE_URL"]!,
                  process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
                );

                const [ownerProfileRes, briefRes] = await Promise.allSettled([
                  db.from("owner_profiles" as never).select("user_id, full_name").eq("id" as never, ownerId).maybeSingle(),
                  briefId
                    ? db.from("advertiser_briefs" as never).select("title, zones, start_date, end_date, user_id").eq("id" as never, briefId).maybeSingle()
                    : Promise.resolve({ data: null }),
                ]);

                const ownerProfile = ownerProfileRes.status === "fulfilled"
                  ? (ownerProfileRes.value.data as { user_id?: string; full_name?: string } | null)
                  : null;
                const brief = briefRes.status === "fulfilled"
                  ? (briefRes.value.data as { title?: string; zones?: string[]; start_date?: string; end_date?: string; user_id?: string } | null)
                  : null;

                if (ownerProfile?.user_id) {
                  const userRes = await db.auth.admin.getUserById(ownerProfile.user_id);
                  const ownerEmail = userRes.data?.user?.email;

                  if (ownerEmail) {
                    // Get advertiser company name
                    let advertiserName: string | undefined;
                    if (brief?.user_id) {
                      const { data: advProfile } = await db
                        .from("advertiser_profiles" as never)
                        .select("full_name")
                        .eq("user_id" as never, brief.user_id)
                        .maybeSingle();
                      advertiserName = (advProfile as { full_name?: string } | null)?.full_name;
                    }

                    const fmtDate = (d: string | null | undefined) =>
                      d ? new Date(d).toLocaleDateString("fr-FR") : undefined;

                    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
                    const templateName = newStatus === "accepted" ? "brief-proposal-accepted" : "brief-proposal-rejected";

                    await sendAppEmailSafe({
                      templateName,
                      recipientEmail: ownerEmail,
                      templateData: {
                        ownerName: ownerProfile.full_name?.split(" ")[0] ?? ownerProfile.full_name,
                        briefTitle: brief?.title,
                        company: advertiserName,
                        zone: brief?.zones?.length ? brief.zones[0] : undefined,
                        startDate: fmtDate(brief?.start_date),
                        endDate: fmtDate(brief?.end_date),
                        dashboardUrl: newStatus === "accepted"
                          ? "https://move-spot.com/proprietaire"
                          : "https://move-spot.com/proprietaire/briefs",
                      },
                    });
                  }
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
                // Push
                await sendWebPushToUser(userId, {
                  title: newCertif === "certified" ? "Certification validée !" : "Certification refusée",
                  body: newCertif === "certified"
                    ? "Vous êtes maintenant certifié MoveSpot."
                    : "Votre certification a été refusée. Consultez les notes.",
                  url: "/chauffeur/espace",
                });
                // Email
                const db = createClient(
                  process.env["SUPABASE_URL"]!,
                  process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
                );
                const userRes = await db.auth.admin.getUserById(userId);
                const payeeEmail = userRes.data?.user?.email;
                if (payeeEmail) {
                  const { sendAppEmailSafe } = await import("@/lib/email/send.server");
                  await sendAppEmailSafe({
                    templateName: "payee-certification",
                    recipientEmail: payeeEmail,
                    templateData: {
                      fullName: (record.full_name as string | undefined) ?? undefined,
                      certified: newCertif === "certified",
                      notes: newCertif === "rejected"
                        ? (record.certification_notes as string | undefined) ?? undefined
                        : undefined,
                      spaceUrl: "https://move-spot.com/chauffeur/espace",
                    },
                  });
                }
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
                  // Push
                  await sendWebPushToUser(userId, {
                    title: newStatus === "approved" ? "Véhicule approuvé !" : "Véhicule refusé",
                    body: name
                      ? (newStatus === "approved"
                          ? `${name} est maintenant visible par les annonceurs.`
                          : `${name} n'a pas été approuvé. Consultez les notes.`)
                      : undefined,
                    url: "/proprietaire",
                  });
                  // Email
                  const db = createClient(
                    process.env["SUPABASE_URL"]!,
                    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
                  );
                  const userRes = await db.auth.admin.getUserById(userId);
                  const ownerEmail = userRes.data?.user?.email;
                  if (ownerEmail) {
                    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
                    await sendAppEmailSafe({
                      templateName: "vehicle-status",
                      recipientEmail: ownerEmail,
                      templateData: {
                        vehicleName: name,
                        approved: newStatus === "approved",
                        reason: newStatus === "rejected"
                          ? (record.admin_notes as string | undefined) ?? undefined
                          : undefined,
                        dashboardUrl: "https://move-spot.com/proprietaire",
                      },
                    });
                  }
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
