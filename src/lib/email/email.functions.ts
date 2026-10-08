import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = "https://move-spot.com";

/**
 * Sends the welcome email to a newly registered advertiser.
 * Called client-side immediately after profile creation succeeds.
 * Idempotent — safe to call more than once for the same user.
 */
export const sendAdvertiserWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch the advertiser profile and auth user email
    const [profileResult, userResult] = await Promise.all([
      (supabase as any)
        .from("advertiser_profiles")
        .select("full_name, company")
        .eq("user_id", userId)
        .maybeSingle(),
      (supabaseAdmin as any).auth.admin.getUserById(userId),
    ]);

    const email: string | undefined = userResult.data?.user?.email;
    if (!email) return { sent: false, reason: "no_email" };

    const profile = profileResult.data;
    const firstName = (profile?.company as string | null) ?? (profile?.full_name as string | null) ?? undefined;
    const displayName = firstName?.split(" ")[0]; // first word of company or full_name

    const { sendAppEmailSafe } = await import("@/lib/email/send.server");
    const result = await sendAppEmailSafe({
      templateName: "advertiser-welcome",
      recipientEmail: email,
      idempotencyKey: `advertiser-welcome-${userId}`,
      templateData: {
        firstName: displayName,
        dashboardUrl: `${BASE_URL}/annonceur`,
      },
    });

    return result;
  });
