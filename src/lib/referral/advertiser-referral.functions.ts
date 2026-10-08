import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public — called before auth (same pattern as resolveReferralCode)
export const resolveAdvertiserInviteCode = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ code: z.string().min(1).max(12) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await (supabaseAdmin as any)
      .from("advertiser_profiles")
      .select("id, full_name, company")
      .eq("referral_code", data.code.trim().toUpperCase())
      .maybeSingle();

    if (!profile) return { ok: false as const };
    const displayName: string = (profile.company as string | null) ?? (profile.full_name as string) ?? "un annonceur";
    return { ok: true as const, advertiserId: profile.id as string, name: displayName };
  });

export const getMyReferralStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).parse(input))
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: myProfile } = await (supabase as any)
      .from("advertiser_profiles")
      .select("id, referral_code")
      .eq("user_id", userId)
      .maybeSingle();

    if (!myProfile) return { ok: false as const };

    const { data: rewards } = await (supabaseAdmin as any)
      .from("advertiser_referral_rewards")
      .select("id, status, credited_at, created_at")
      .eq("referrer_id", myProfile.id)
      .order("created_at", { ascending: false });

    return {
      ok: true as const,
      referralCode: myProfile.referral_code as string,
      rewards: (rewards ?? []) as Array<{
        id: string;
        status: "pending" | "credited";
        credited_at: string | null;
        created_at: string;
      }>,
    };
  });
