import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ campaignRequestId: z.string().uuid() });

/** Vire le forfait POSE au poseur via Stripe Connect. Admin uniquement. */
export const transferToPoseInstaller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");

    const { payInstallerFee } = await import("@/lib/campaigns/installer-payout.server");
    return payInstallerFee(data.campaignRequestId, "pose");
  });

/** Vire le forfait DÉPOSE au poseur via Stripe Connect. Admin uniquement. */
export const transferToDeposeInstaller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Accès réservé aux administrateurs");

    const { payInstallerFee } = await import("@/lib/campaigns/installer-payout.server");
    return payInstallerFee(data.campaignRequestId, "depose");
  });
