import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_vehicles",
  title: "Lister mes véhicules",
  description:
    "Liste les véhicules publicitaires du propriétaire connecté (type, état, zones, prix/jour, statut de modération).",
  inputSchema: {
    limit: z.number().int().optional().describe("Nombre maximum de véhicules à retourner (défaut 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }: { limit?: number }, ctx: import("@lovable.dev/mcp-js").ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, name, type, description, condition, zones, surface_m2, km_per_day, price_per_day, status, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { vehicles: data ?? [] },
    };
  },
});
