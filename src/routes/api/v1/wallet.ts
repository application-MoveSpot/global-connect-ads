import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, apiJson } from "@/lib/api/api-key-auth.server";

export const Route = createFileRoute("/api/v1/wallet")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("wallets")
          .select("balance_cents, currency")
          .eq("user_id", auth.userId)
          .maybeSingle();

        if (error) return apiJson({ error: error.message }, 500);
        if (!data) return apiJson({ balance_cents: 0, currency: "EUR" });

        return apiJson({ balance_cents: data.balance_cents, currency: data.currency });
      },
    },
  },
});
