import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";

const ProposalInput = z.object({
  id: z.string(),
  vehicleName: z.string(),
  vehicleType: z.string(),
  pricePerDay: z.number(),
  totalPrice: z.number(),
  message: z.string().optional(),
});

const ProposalCompareInput = z.object({
  proposals: z.array(ProposalInput).min(2).max(10),
  briefTitle: z.string().max(200),
  briefDays: z.number().optional(),
  briefBudgetMax: z.number().optional(),
});

export type ProposalComparisonResult = {
  summary: string;
  items: Array<{ id: string; pros: string[]; cons: string[]; verdict: string }>;
  recommendation: string;
};

export const compareProposals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof ProposalCompareInput>) => ProposalCompareInput.parse(d))
  .handler(async ({ data, context }): Promise<ProposalComparisonResult> => {
    assertRateLimit(`compare-proposals:${context.userId}`, { maxRequests: 20, windowMs: 60_000 });
    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const { generateText } = await import("ai");

    type PI = z.infer<typeof ProposalInput>;
    const proposalLines = data.proposals
      .map(
        (p: PI, i: number) =>
          `${i + 1}. ${p.vehicleName} (${p.vehicleType}) — ${p.pricePerDay}€/jour${data.briefDays ? ` soit ${p.totalPrice}€ au total` : ""}${p.message ? `\n   Message : "${p.message.slice(0, 200)}"` : ""}`,
      )
      .join("\n");

    const budgetNote = data.briefBudgetMax ? `Budget max annonceur : ${data.briefBudgetMax}€.` : "";

    const prompt = `Tu es un conseiller en publicité mobile pour des particuliers en France. Aide cet annonceur à choisir parmi les propositions reçues pour son brief "${data.briefTitle}".

Propositions reçues :
${proposalLines}

${budgetNote}

Réponds en JSON strict. Pour chaque proposition, identifie 1-2 avantages et 1-2 inconvénients concrets, en langage simple (pas de jargon). Donne une recommandation claire en 2 phrases maximum.

{
  "summary": "Phrase courte résumant la situation globale (ex: '3 propositions similaires, une se démarque par...')",
  "items": [
    {
      "id": "id_de_la_proposition",
      "pros": ["avantage 1", "avantage 2"],
      "cons": ["inconvénient 1"],
      "verdict": "Une phrase de verdict (ex: 'Bon rapport qualité/prix pour un événement local')"
    }
  ],
  "recommendation": "Recommandation finale en 1-2 phrases claires, en tutoyant l'annonceur"
}`;

    let text: string;
    try {
      ({ text } = await generateText({ model, prompt, temperature: 0.3, maxOutputTokens: 600 }));
    } catch (err) {
      captureServerException(err, { category: "ai", userId: context.userId });
      throw err;
    }

    try {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as ProposalComparisonResult;
      return {
        summary: String(parsed.summary ?? "").slice(0, 300),
        items: Array.isArray(parsed.items)
          ? parsed.items.map((item) => ({
              id: String(item.id ?? ""),
              pros: Array.isArray(item.pros) ? item.pros.slice(0, 3).map(String) : [],
              cons: Array.isArray(item.cons) ? item.cons.slice(0, 3).map(String) : [],
              verdict: String(item.verdict ?? "").slice(0, 200),
            }))
          : [],
        recommendation: String(parsed.recommendation ?? "").slice(0, 400),
      };
    } catch {
      return {
        summary: "Plusieurs propositions disponibles.",
        items: data.proposals.map((p: z.infer<typeof ProposalInput>) => ({
          id: p.id,
          pros: [],
          cons: [],
          verdict: "",
        })),
        recommendation: "Comparez les prix et les messages des propriétaires avant de décider.",
      };
    }
  });
