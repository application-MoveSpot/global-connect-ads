import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = () =>
  createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
  );

export const savePushSubscription = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as {
    userId: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  })
  .handler(async ({ data }) => {
    const db = supabaseAdmin();
    await db
      .from("push_subscriptions" as never)
      .upsert(
        {
          user_id: data.userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent,
        } as never,
        { onConflict: "user_id,endpoint" },
      );
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { userId: string; endpoint: string })
  .handler(async ({ data }) => {
    const db = supabaseAdmin();
    await db
      .from("push_subscriptions" as never)
      .delete()
      .eq("user_id" as never, data.userId)
      .eq("endpoint" as never, data.endpoint);
    return { ok: true };
  });
