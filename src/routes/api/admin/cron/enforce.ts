import { createFileRoute } from "@tanstack/react-router";

// POST /api/admin/cron/enforce
// Secured with Authorization: Bearer <CRON_SECRET>
// Call this daily (e.g. via Supabase pg_cron, Cloudflare Cron Triggers, or an external scheduler).
// Handles:
//   1. Unpaid approved campaigns → reminders at 3d / 6d, expiration at 7d
//   2. Installation overdue → reminder to driver/owner after 2 days
//   3. GPS inactivity → alert to vehicle owner when no GPS points for yesterday

export const Route = createFileRoute("/api/admin/cron/enforce")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const cronSecret = process.env["CRON_SECRET"];
        if (!cronSecret) {
          return Response.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
        }
        const url = new URL(request.url);
        const token =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace("Bearer ", "") ??
          url.searchParams.get("secret");
        if (token !== cronSecret) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendAppEmailSafe } = await import("@/lib/email/send.server");
        const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");

        const results: Record<string, unknown> = {};

        // ─── 1. Unpaid approved campaigns ────────────────────────────────────────
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();
        const sixDaysAgo = new Date(now.getTime() - 6 * 86_400_000).toISOString();
        const threeDaysAgo = new Date(now.getTime() - 3 * 86_400_000).toISOString();

        const { data: unpaidCampaigns } = await supabaseAdmin
          .from("campaign_requests")
          .select("id, spot_name, company, email, user_id, created_at, total_price")
          .eq("status", "approved")
          .neq("payment_status", "paid")
          .lte("created_at", threeDaysAgo)
          .order("created_at", { ascending: true });

        const paymentResults = { reminders3d: 0, reminders6d: 0, expired: 0 };

        await Promise.allSettled(
          (unpaidCampaigns ?? []).map(async (c) => {
            const cr = c as {
              id: string; spot_name: string; company: string; email: string;
              user_id: string | null; created_at: string; total_price: number | null;
            };
            const ageMs = now.getTime() - new Date(cr.created_at).getTime();
            const ageDays = Math.floor(ageMs / 86_400_000);

            if (ageDays >= 7) {
              // Expire the campaign
              await supabaseAdmin
                .from("campaign_requests")
                .update({ status: "expired" } as never)
                .eq("id", cr.id);

              await sendAppEmailSafe({
                templateName: "campaign-expired-notice",
                recipientEmail: cr.email,
                templateData: {
                  fullName: cr.company,
                  spotName: cr.spot_name,
                  dashboardUrl: "https://move-spot.com/annonceur",
                },
                idempotencyKey: `expired-${cr.id}`,
              });

              if (cr.user_id) {
                await sendWebPushToUser(cr.user_id, {
                  title: "❌ Campagne annulée",
                  body: `La campagne "${cr.spot_name}" a été annulée faute de paiement.`,
                  url: "/annonceur",
                });
              }
              paymentResults.expired++;
            } else if (ageDays >= 6 && new Date(cr.created_at) <= new Date(sixDaysAgo)) {
              const daysLeft = 7 - ageDays;
              await sendAppEmailSafe({
                templateName: "campaign-payment-reminder",
                recipientEmail: cr.email,
                templateData: {
                  fullName: cr.company,
                  spotName: cr.spot_name,
                  totalPrice: cr.total_price ? `${cr.total_price} €` : undefined,
                  daysLeft,
                  payUrl: "https://move-spot.com/annonceur",
                },
                idempotencyKey: `reminder-6d-${cr.id}`,
              });

              if (cr.user_id) {
                await sendWebPushToUser(cr.user_id, {
                  title: "⚠️ Paiement urgent",
                  body: `Dernière chance — votre campagne "${cr.spot_name}" expire dans ${daysLeft} jour(s).`,
                  url: "/annonceur",
                });
              }
              paymentResults.reminders6d++;
            } else if (ageDays >= 3) {
              const daysLeft = 7 - ageDays;
              await sendAppEmailSafe({
                templateName: "campaign-payment-reminder",
                recipientEmail: cr.email,
                templateData: {
                  fullName: cr.company,
                  spotName: cr.spot_name,
                  totalPrice: cr.total_price ? `${cr.total_price} €` : undefined,
                  daysLeft,
                  payUrl: "https://move-spot.com/annonceur",
                },
                idempotencyKey: `reminder-3d-${cr.id}`,
              });

              if (cr.user_id) {
                await sendWebPushToUser(cr.user_id, {
                  title: "💳 Rappel paiement",
                  body: `Votre campagne "${cr.spot_name}" est en attente de paiement (${daysLeft}j restants).`,
                  url: "/annonceur",
                });
              }
              paymentResults.reminders3d++;
            }
          }),
        );
        results.payment = paymentResults;

        // ─── 2. Installation overdue (> 2 days after campaign start) ─────────────
        const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString().slice(0, 10);
        const { data: overdueInstallations } = await supabaseAdmin
          .from("campaign_requests")
          .select("id, spot_name, start_date, vehicle_id, user_id")
          .eq("payment_status", "paid")
          .eq("installation_status", "pending")
          .lte("start_date", twoDaysAgo);

        const installResults = { remindersSent: 0 };

        await Promise.allSettled(
          (overdueInstallations ?? []).map(async (c) => {
            const cr = c as {
              id: string; spot_name: string; start_date: string | null;
              vehicle_id: string | null; user_id: string | null;
            };
            if (!cr.vehicle_id) return;

            // Get driver info for this vehicle
            const { data: vehicle } = await supabaseAdmin
              .from("vehicles")
              .select("name, driver_id, owner_id")
              .eq("id", cr.vehicle_id)
              .maybeSingle();
            if (!vehicle) return;

            const veh = vehicle as { name: string; driver_id: string | null; owner_id: string };
            const delayDays = cr.start_date
              ? Math.floor((now.getTime() - new Date(cr.start_date).getTime()) / 86_400_000)
              : 0;
            const fmtDate = (d: string | null) =>
              d ? new Date(d).toLocaleDateString("fr-FR") : undefined;

            // Notify driver if assigned
            if (veh.driver_id) {
              const { data: driver } = await supabaseAdmin
                .from("drivers")
                .select("full_name, email, user_id")
                .eq("id", veh.driver_id)
                .maybeSingle();
              const drv = driver as { full_name: string; email: string | null; user_id: string | null } | null;
              if (drv?.email) {
                await sendAppEmailSafe({
                  templateName: "installation-overdue",
                  recipientEmail: drv.email,
                  templateData: {
                    fullName: drv.full_name,
                    spotName: cr.spot_name,
                    startDate: fmtDate(cr.start_date),
                    delayDays,
                    jobUrl: "https://move-spot.com/chauffeur/espace",
                  },
                  idempotencyKey: `install-overdue-driver-${cr.id}`,
                });
              }
              if (drv?.user_id) {
                await sendWebPushToUser(drv.user_id, {
                  title: "🔧 Confirmation de pose requise",
                  body: `La pose pour "${cr.spot_name}" est en retard (${delayDays}j). Confirmez dès que possible.`,
                  url: "/chauffeur/espace",
                });
              }
            }

            // Always also notify owner
            const ownerAuth = await supabaseAdmin.auth.admin.getUserById(veh.owner_id);
            const ownerEmail = ownerAuth.data?.user?.email;
            if (ownerEmail) {
              await sendAppEmailSafe({
                templateName: "installation-overdue",
                recipientEmail: ownerEmail,
                templateData: {
                  spotName: cr.spot_name,
                  startDate: fmtDate(cr.start_date),
                  delayDays,
                  jobUrl: "https://move-spot.com/proprietaire",
                },
                idempotencyKey: `install-overdue-owner-${cr.id}`,
              });
            }
            await sendWebPushToUser(veh.owner_id, {
              title: "🔧 Pose non confirmée",
              body: `La pose pour "${cr.spot_name}" sur "${veh.name}" est en retard.`,
              url: "/proprietaire",
            });
            installResults.remindersSent++;
          }),
        );
        results.installation = installResults;

        // ─── 3. GPS inactivity (no points yesterday for active campaigns) ─────────
        const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
        const todayStr = now.toISOString().slice(0, 10);

        const { data: activeCampaigns } = await supabaseAdmin
          .from("campaign_requests")
          .select("id, spot_name, vehicle_id")
          .eq("payment_status", "paid")
          .lte("start_date", todayStr)
          .gte("end_date", todayStr)
          .not("vehicle_id", "is", null);

        const gpsResults = { alertsSent: 0 };

        await Promise.allSettled(
          (activeCampaigns ?? []).map(async (c) => {
            const cr = c as { id: string; spot_name: string; vehicle_id: string };

            // Check if any GPS points were recorded yesterday
            const { data: metrics } = await supabaseAdmin
              .from("campaign_metrics")
              .select("points_total")
              .eq("campaign_request_id", cr.id)
              .eq("day", yesterday)
              .maybeSingle();

            const pointsYesterday = (metrics as { points_total: number } | null)?.points_total ?? 0;
            if (pointsYesterday > 0) return; // GPS was active, no alert needed

            const { data: vehicle } = await supabaseAdmin
              .from("vehicles")
              .select("name, owner_id")
              .eq("id", cr.vehicle_id)
              .maybeSingle();
            if (!vehicle) return;

            const veh = vehicle as { name: string; owner_id: string };
            const ownerAuth = await supabaseAdmin.auth.admin.getUserById(veh.owner_id);
            const ownerEmail = ownerAuth.data?.user?.email;

            if (ownerEmail) {
              await sendAppEmailSafe({
                templateName: "gps-inactivity-alert",
                recipientEmail: ownerEmail,
                templateData: {
                  vehicleName: veh.name,
                  spotName: cr.spot_name,
                  trackingUrl: "https://move-spot.com/proprietaire/tracking",
                },
                idempotencyKey: `gps-inactive-${cr.id}-${yesterday}`,
              });
            }
            await sendWebPushToUser(veh.owner_id, {
              title: "📍 GPS inactif",
              body: `Aucun point GPS hier pour "${veh.name}" (campagne "${cr.spot_name}"). Démarrez le suivi.`,
              url: "/proprietaire/tracking",
            });
            gpsResults.alertsSent++;
          }),
        );
        results.gps = gpsResults;

        return Response.json({ ok: true, results });
      },

      GET: async ({ request }: { request: Request }) => {
        const cronSecret = process.env["CRON_SECRET"];
        if (!cronSecret) {
          return Response.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
        }
        const url = new URL(request.url);
        const token =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace("Bearer ", "") ??
          url.searchParams.get("secret");
        if (token !== cronSecret) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }
        return Response.json({ ok: true, message: "Endpoint cron actif. Utilisez POST pour exécuter." });
      },
    },
  },
});
