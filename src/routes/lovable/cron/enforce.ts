import { createFileRoute } from "@tanstack/react-router";

// POST /lovable/cron/enforce
// Secured with Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
// Called daily by Supabase pg_cron. Lives under /lovable/ to bypass Lovable's
// platform auth middleware (which rejects raw service-role-key Bearer tokens).
// Handles:
//   1. Unpaid approved campaigns → reminders at 3d / 6d, expiration at 7d
//   2. Installation overdue → reminder to driver/owner after 2 days
//   3. GPS inactivity → alert to vehicle owner when no GPS points for yesterday

export const Route = createFileRoute("/lovable/cron/enforce")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        const cronSecret = process.env["CRON_SECRET"];
        const url = new URL(request.url);
        const token =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace("Bearer ", "") ??
          url.searchParams.get("secret");
        const validTokens = [cronSecret].filter(Boolean) as string[];
        if (!token || !validTokens.includes(token)) {
          return Response.json({ error: "Non autorisé" }, { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendAppEmailSafe } = await import("@/lib/email/send.server");
        const { sendWebPushToUser } = await import("@/lib/notifications/push-send.server");

        const results: Record<string, unknown> = {};

        // ─── 1. Unpaid approved campaigns ────────────────────────────────────────
        const now = new Date();
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
                  dashboardUrl: "https://move-spot.com/advertiser",
                },
                idempotencyKey: `expired-${cr.id}`,
              });

              if (cr.user_id) {
                await sendWebPushToUser(cr.user_id, {
                  title: "❌ Campagne annulée",
                  body: `La campagne "${cr.spot_name}" a été annulée faute de paiement.`,
                  url: "/advertiser",
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
                  payUrl: "https://move-spot.com/advertiser",
                },
                idempotencyKey: `reminder-6d-${cr.id}`,
              });

              if (cr.user_id) {
                await sendWebPushToUser(cr.user_id, {
                  title: "⚠️ Paiement urgent",
                  body: `Dernière chance — votre campagne "${cr.spot_name}" expire dans ${daysLeft} jour(s).`,
                  url: "/advertiser",
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
                  payUrl: "https://move-spot.com/advertiser",
                },
                idempotencyKey: `reminder-3d-${cr.id}`,
              });

              if (cr.user_id) {
                await sendWebPushToUser(cr.user_id, {
                  title: "💳 Rappel paiement",
                  body: `Votre campagne "${cr.spot_name}" est en attente de paiement (${daysLeft}j restants).`,
                  url: "/advertiser",
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
                    jobUrl: "https://move-spot.com/driver/espace",
                  },
                  idempotencyKey: `install-overdue-driver-${cr.id}`,
                });
              }
              if (drv?.user_id) {
                await sendWebPushToUser(drv.user_id, {
                  title: "🔧 Confirmation de pose requise",
                  body: `La pose pour "${cr.spot_name}" est en retard (${delayDays}j). Confirmez dès que possible.`,
                  url: "/driver/espace",
                });
              }
            }

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
                  jobUrl: "https://move-spot.com/owner",
                },
                idempotencyKey: `install-overdue-owner-${cr.id}`,
              });
            }
            await sendWebPushToUser(veh.owner_id, {
              title: "🔧 Pose non confirmée",
              body: `La pose pour "${cr.spot_name}" sur "${veh.name}" est en retard.`,
              url: "/owner",
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

            const { data: metrics } = await supabaseAdmin
              .from("campaign_metrics")
              .select("points_total")
              .eq("campaign_request_id", cr.id)
              .eq("day", yesterday)
              .maybeSingle();

            const pointsYesterday = (metrics as { points_total: number } | null)?.points_total ?? 0;
            if (pointsYesterday > 0) return;

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
                  trackingUrl: "https://move-spot.com/owner/tracking",
                },
                idempotencyKey: `gps-inactive-${cr.id}-${yesterday}`,
              });
            }
            await sendWebPushToUser(veh.owner_id, {
              title: "📍 GPS inactif",
              body: `Aucun point GPS hier pour "${veh.name}" (campagne "${cr.spot_name}"). Démarrez le suivi.`,
              url: "/owner/tracking",
            });
            gpsResults.alertsSent++;
          }),
        );
        results.gps = gpsResults;

        // ─── 4. Matching proactif briefs ↔ flottes ────────────────────────────────
        try {
          const sevenDaysAgo2 = new Date(now.getTime() - 7 * 86_400_000).toISOString();
          const { data: recentBriefs } = await supabaseAdmin
            .from("advertiser_briefs")
            .select("id, title, vehicle_types, zones, start_date")
            .gte("created_at", sevenDaysAgo2)
            .order("created_at", { ascending: false });

          const { data: approvedVehicles } = await supabaseAdmin
            .from("vehicles")
            .select("id, type, zones, owner_profiles!inner(user_id, full_name)")
            .eq("status", "approved");

          if (recentBriefs?.length && approvedVehicles?.length) {
            type OwnerBucket = { userId: string; name: string; types: Set<string>; };
            const ownerMap = new Map<string, OwnerBucket>();
            for (const v of approvedVehicles) {
              const prof = (v as unknown as Record<string, unknown>).owner_profiles as { user_id: string; full_name: string } | null;
              if (!prof) continue;
              if (!ownerMap.has(prof.user_id)) {
                ownerMap.set(prof.user_id, { userId: prof.user_id, name: prof.full_name ?? "", types: new Set() });
              }
              ownerMap.get(prof.user_id)!.types.add(String(v.type));
            }

            const matchingStats = { notified: 0 };
            for (const [, owner] of ownerMap) {
              const compatible = recentBriefs.filter((b) =>
                ((b.vehicle_types as string[] | null) ?? []).some((t) => owner.types.has(t)),
              );
              if (!compatible.length) continue;
              const top = compatible[0]!;
              await sendWebPushToUser(owner.userId, {
                title: "🎯 Nouveaux briefs pour votre flotte",
                body: compatible.length === 1
                  ? `"${top.title}" correspond à votre flotte — répondez en premier !`
                  : `${compatible.length} briefs correspondent à votre flotte. Ne les ratez pas !`,
                url: "/owner/briefs",
              }).catch(() => {/* best-effort */});
              matchingStats.notified++;
            }
            results.matching = matchingStats;
          } else {
            results.matching = { notified: 0 };
          }
        } catch {
          results.matching = { error: "matching skipped" };
        }

        // ─── 5. Auto-modération visuels ───────────────────────────────────────────
        try {
          const twoDaysAgoIso = new Date(now.getTime() - 2 * 86_400_000).toISOString();
          const { data: briefsWithCreatives } = await supabaseAdmin
            .from("advertiser_briefs")
            .select("id, title, creative_files, advertiser_id")
            .gte("created_at", twoDaysAgoIso)
            .not("creative_files", "is", null);

          const apiKey = process.env["LOVABLE_API_KEY"];
          const modStats = { analysed: 0, suspects: 0 };

          if (apiKey && briefsWithCreatives?.length) {
            const { data: admins } = await supabaseAdmin
              .from("user_roles" as never)
              .select("user_id")
              .eq("role" as never, "admin");

            for (const brief of briefsWithCreatives) {
              const files = (brief.creative_files as string[] | null) ?? [];
              for (const storagePath of files.slice(0, 2)) {
                const { data: urlData } = await supabaseAdmin.storage
                  .from("campaign-creatives")
                  .createSignedUrl(storagePath, 60);
                if (!urlData?.signedUrl) continue;

                try {
                  const imgResp = await fetch(urlData.signedUrl);
                  if (!imgResp.ok) continue;
                  const buf = await imgResp.arrayBuffer();
                  const base64 = Buffer.from(buf).toString("base64");
                  const mimeType = imgResp.headers.get("content-type") ?? "image/jpeg";

                  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash",
                      messages: [{
                        role: "user",
                        content: [
                          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
                          { type: "text", text: 'Analyse ce visuel publicitaire. Réponds en JSON: {"safe":true/false,"score_risque":0-100,"verdict":"conforme"|"suspect"|"interdit","issues":[]}. Score > 50 = suspect.' },
                        ],
                      }],
                      temperature: 0.1,
                      max_tokens: 150,
                    }),
                  });

                  modStats.analysed++;
                  if (aiResp.ok) {
                    const json = await aiResp.json() as { choices?: Array<{ message?: { content?: string } }> };
                    const raw = json.choices?.[0]?.message?.content ?? "{}";
                    let parsed: { score_risque?: number; verdict?: string } = {};
                    try { parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, "")); } catch { /* ignore */ }
                    const score = Number(parsed.score_risque ?? 0);
                    if (score >= 50) {
                      modStats.suspects++;
                      for (const admin of (admins ?? []) as Array<{ user_id: string }>) {
                        await sendWebPushToUser(admin.user_id, {
                          title: "🚨 Visuel suspect détecté",
                          body: `Brief "${brief.title}" : visuel avec score risque ${score}/100. Vérifiez dans Modération IA.`,
                          url: "/admin/dashboard",
                        }).catch(() => {/* best-effort */});
                      }
                    }
                  }
                } catch { /* best-effort per file */ }
              }
            }
          }
          results.autoModeration = modStats;
        } catch {
          results.autoModeration = { error: "auto-moderation skipped" };
        }

        return Response.json({ ok: true, results });
      },
    },
  },
});
