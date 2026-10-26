import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const REGIONS = ["europe", "afrique", "asie", "amerique", "moyen_orient"] as const;

export const updateAdvertiserRegion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        target_region: z.enum(REGIONS).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await (supabase as any)
      .from("advertiser_profiles")
      .update({ target_region: data.target_region })
      .eq("user_id", userId);
    if (error) return { ok: false as const, error: (error as { message: string }).message };
    return { ok: true as const };
  });
