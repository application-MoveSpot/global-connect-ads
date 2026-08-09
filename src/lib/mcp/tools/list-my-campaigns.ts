import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_campaigns",
  title: "Lister mes campagnes",
  description:
    "Liste les demandes de campagne visibles par l'utilisateur connecté (dates, statut, paiement, montants).",
  inputSchema: {
    status: z.string().optional().describe("Filtrer sur un statut exact (ex: pending, accepted, rejected)."),
    limit: z.number().int().optional().describe("Nombre maximum de campagnes (défaut 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("campaign_requests")
      .select(
        "id, spot_name, company, start_date, end_date, days_count, total_price, status, payment_status, platform_fee_cents, owner_amount_cents, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { campaigns: data ?? [] },
    };
  },
});
