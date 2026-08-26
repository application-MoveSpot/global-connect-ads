import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_wallet_balance",
  title: "Solde du portefeuille",
  description:
    "Retourne le solde du portefeuille MoveSpot de l'utilisateur connecté et ses dernières transactions.",
  inputSchema: {
    transactions_limit: z
      .number()
      .int()
      .optional()
      .describe("Nombre de transactions récentes à inclure (défaut 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ transactions_limit }: { transactions_limit?: number }, ctx: import("@lovable.dev/mcp-js").ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("id, balance_cents, currency, updated_at")
      .maybeSingle();
    if (walletError) return { content: [{ type: "text", text: walletError.message }], isError: true };

    const { data: transactions, error: txError } = await supabase
      .from("wallet_transactions")
      .select("id, kind, amount_cents, currency, description, created_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(transactions_limit ?? 10, 1), 50));
    if (txError) return { content: [{ type: "text", text: txError.message }], isError: true };

    const payload = { wallet: wallet ?? null, transactions: transactions ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
