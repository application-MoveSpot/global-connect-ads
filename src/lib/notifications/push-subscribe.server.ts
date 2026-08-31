import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const supabaseAdmin = () =>
  createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"]!,
  );

// Web Push keys are base64url-encoded binary; generous but bounded limits
const SaveSchema = z.object({
  endpoint: z.string().url().max(2000),
  p256dh: z.string().min(1).max(512),
  auth: z.string().min(1).max(256),
  userAgent: z.string().max(500).optional(),
});

const RemoveSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => SaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = supabaseAdmin();
    await db
      .from("push_subscriptions" as never)
      .upsert(
        {
          user_id: context.userId, // from auth session — never trust client-supplied userId
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
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => RemoveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = supabaseAdmin();
    await db
      .from("push_subscriptions" as never)
      .delete()
      .eq("user_id" as never, context.userId) // scoped to authenticated user
      .eq("endpoint" as never, data.endpoint);
    return { ok: true };
  });
