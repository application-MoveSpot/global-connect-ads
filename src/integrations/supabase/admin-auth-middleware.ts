import { createMiddleware } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type AuthContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims: Record<string, unknown>;
};

/**
 * Middleware to enforce aal2 MFA for admin server functions.
 * Must follow requireSupabaseAuth in the middleware chain.
 * Rejects with 403 if the admin has a verified TOTP factor but aal < aal2.
 */
export const requireAdminMFA = createMiddleware({ type: "function" }).server(
  async ({ next, context }) => {
    const ctx = context as AuthContext;

    // aal2 claim present — MFA challenge was completed
    if ((ctx.claims as { aal?: string }).aal === "aal2") {
      return next({});
    }

    // aal < aal2: check whether a verified TOTP factor is enrolled
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(ctx.userId);
    const factors =
      (
        userInfo?.user as {
          factors?: Array<{ factor_type: string; status: string }>;
        }
      )?.factors ?? [];
    const hasVerifiedTotp = factors.some(
      (f) => f.factor_type === "totp" && f.status === "verified",
    );

    if (hasVerifiedTotp) {
      throw new Response(
        JSON.stringify({
          error: "mfa_required",
          message: "Admin access requires MFA verification (aal2)",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    // No TOTP factor enrolled yet — allow (admin must set up 2FA separately)
    return next({});
  },
);
