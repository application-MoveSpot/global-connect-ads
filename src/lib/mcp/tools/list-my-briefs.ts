import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_briefs",
  title: "Lister mes briefs",
  description:
    "Liste les briefs publicitaires visibles par l'utilisateur connecté (titre, zones, budget, dates, statut).",
  inputSchema: {
    limit: z.number().int().optional().describe("Nombre maximum de briefs (défaut 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("advertiser_briefs")
      .select(
        "id, title, description, vehicle_types, ad_format, zones, start_date, end_date, days_count, budget_max, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { briefs: data ?? [] },
    };
  },
});
