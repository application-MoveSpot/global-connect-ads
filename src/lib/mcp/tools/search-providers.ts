import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_providers",
  title: "Rechercher des prestataires",
  description:
    "Recherche dans l'annuaire MoveSpot des prestataires approuvés (covering, production vidéo, création graphique).",
  inputSchema: {
    query: z.string().optional().describe("Texte recherché dans le nom de société ou la description."),
    service: z
      .string()
      .optional()
      .describe("Service recherché, par exemple covering, video ou graphisme."),
    limit: z.number().int().optional().describe("Nombre maximum de résultats (défaut 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, service, limit }: { query?: string; service?: string; limit?: number }, ctx: import("@lovable.dev/mcp-js").ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let request = supabase
      .from("public_provider_profiles")
      .select("user_id, company, coverage_areas, description, services, pricing_info, website")
      .limit(Math.min(Math.max(limit ?? 20, 1), 100));

    if (query) request = request.or(`company.ilike.%${query}%,description.ilike.%${query}%`);
    if (service) request = request.contains("services", [service]);

    const { data, error } = await request;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { providers: data ?? [] },
    };
  },
});
