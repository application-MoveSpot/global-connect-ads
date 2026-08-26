import { createServerFn } from "@tanstack/react-start";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return;
  webpush.setVapidDetails(
    process.env["VAPID_SUBJECT"]!,
    process.env["VAPID_PUBLIC_KEY"]!,
    process.env["VAPID_PRIVATE_KEY"]!,
  );
  vapidConfigured = true;
}

const supabaseAdmin = () =>
  createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
  );

type PushPayload = { title: string; body?: string; url?: string; tag?: string };

/** Send a push notification to every subscription belonging to a user. */
export async function sendWebPushToUser(userId: string, payload: PushPayload) {
  ensureVapid();
  const db = supabaseAdmin();
  const { data: subs } = await db
    .from("push_subscriptions" as never)
    .select("endpoint, p256dh, auth")
    .eq("user_id" as never, userId);

  if (!subs || subs.length === 0) return;

  const serialized = JSON.stringify(payload);
  await Promise.allSettled(
    (subs as { endpoint: string; p256dh: string; auth: string }[]).map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        serialized,
      ).catch(() => {
        // Subscription may be expired — silently ignore
      }),
    ),
  );
}

/** TanStack server function callable from the client Realtime callbacks. */
export const sendPushToCurrentUser = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { userId: string } & PushPayload)
  .handler(async ({ data: { userId, ...payload } }) => {
    await sendWebPushToUser(userId, payload);
    return { ok: true };
  });
