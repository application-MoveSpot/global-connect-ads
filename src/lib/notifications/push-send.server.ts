import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SUPABASE_ANON_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
const EDGE_FN_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/send-push` : "";

type PushPayload = { title: string; body?: string; url?: string; tag?: string };

/** Send a push notification to every subscription belonging to a user via the Edge Function. */
export async function sendWebPushToUser(userId: string, payload: PushPayload) {
  if (!EDGE_FN_URL || !SUPABASE_ANON_KEY) return;
  try {
    await fetch(EDGE_FN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ userId, ...payload }),
    });
  } catch {
    // Non-fatal — push is best-effort
  }
}

const PushPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(500).optional(),
  url: z.string().url().max(2000).optional(),
  tag: z.string().max(100).optional(),
});

/** TanStack server function callable from client-side Realtime callbacks. */
export const sendPushToCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => PushPayloadSchema.parse(data))
  .handler(async ({ data, context }) => {
    // userId comes from the authenticated session — client cannot spoof it
    await sendWebPushToUser(context.userId, data);
    return { ok: true };
  });
