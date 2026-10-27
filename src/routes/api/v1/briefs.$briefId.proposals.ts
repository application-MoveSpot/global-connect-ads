import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, apiJson } from "@/lib/api/api-key-auth.server";

export const Route = createFileRoute("/api/v1/briefs/$briefId/proposals")({
  server: {
    handlers: {
      GET: async ({ request, params }: { request: Request; params: { briefId: string } }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        const { briefId } = params;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Verify the brief belongs to this advertiser
        const { data: brief } = await supabaseAdmin
          .from("advertiser_briefs")
          .select("id")
          .eq("id", briefId)
          .eq("advertiser_id", auth.userId)
          .maybeSingle();

        if (!brief) return apiJson({ error: "Brief not found" }, 404);

        const { data, error } = await supabaseAdmin
          .from("brief_proposals")
          .select("id, status, price_per_day, message, vehicle_id, owner_id, created_at, updated_at")
          .eq("brief_id", briefId)
          .order("created_at", { ascending: false });

        if (error) return apiJson({ error: error.message }, 500);

        return apiJson({ proposals: data ?? [] });
      },
    },
  },
});
