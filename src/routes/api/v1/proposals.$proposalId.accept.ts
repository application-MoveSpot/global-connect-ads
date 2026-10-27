import { createFileRoute } from "@tanstack/react-router";
import { authenticateApiKey, apiJson } from "@/lib/api/api-key-auth.server";

export const Route = createFileRoute("/api/v1/proposals/$proposalId/accept")({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { proposalId: string } }) => {
        const auth = await authenticateApiKey(request);
        if (auth instanceof Response) return auth;

        const { proposalId } = params;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Fetch the proposal and verify the brief belongs to this advertiser
        const { data: proposal } = await supabaseAdmin
          .from("brief_proposals")
          .select("id, status, brief_id, advertiser_briefs!inner(advertiser_id)")
          .eq("id", proposalId)
          .maybeSingle();

        if (!proposal) return apiJson({ error: "Proposal not found" }, 404);

        const brief = (proposal as { advertiser_briefs: { advertiser_id: string } }).advertiser_briefs;
        if (brief.advertiser_id !== auth.userId) {
          return apiJson({ error: "Proposal not found" }, 404);
        }

        if (proposal.status !== "pending") {
          return apiJson({ error: `Proposal is already ${proposal.status}` }, 409);
        }

        const { error } = await supabaseAdmin
          .from("brief_proposals")
          .update({ status: "accepted", updated_at: new Date().toISOString() })
          .eq("id", proposalId);

        if (error) return apiJson({ error: error.message }, 500);

        return apiJson({ ok: true, proposal_id: proposalId, status: "accepted" });
      },
    },
  },
});
