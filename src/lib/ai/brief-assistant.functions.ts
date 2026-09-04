import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const BriefGenerateInput = z.object({
  businessContext: z.string().min(10).max(600),
  vehicleTypes: z.array(z.string()).optional(),
  zone: z.string().max(200).optional(),
});

export type BriefSuggestion = {
  title: string;
  description: string;
  audience: string;
};

export const generateBriefSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof BriefGenerateInput>) =>
    BriefGenerateInput.parse(d),
  )
  .handler(async ({ data }): Promise<BriefSuggestion> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.0-flash");

    const vehicleLabel =
      data.vehicleTypes?.length
        ? `Véhicules envisagés : ${data.vehicleTypes.join(", ")}.`
        : "";
    const zoneLabel = data.zone ? `Zone cible : ${data.zone}.` : "";

    const prompt = `Tu es un expert en publicité extérieure mobile (véhicules publicitaires en France).
Un annonceur veut créer un brief sur la plateforme MoveSpot. À partir de sa description, génère :
1. Un titre accrocheur (max 80 caractères) — commence par l'action ou le nom de la marque
2. Une description convaincante (3-5 phrases, 150-300 mots) — message clé, ton, ce que verront les passants
3. L'audience cible (20-60 mots) — âge, CSP, zone, comportements

Contexte annonceur : ${data.businessContext}
${vehicleLabel}
${zoneLabel}

Réponds UNIQUEMENT en JSON strict :
{
  "title": "...",
  "description": "...",
  "audience": "..."
}`;

    const { text } = await generateText({ model, prompt, temperature: 0.7, maxOutputTokens: 600 });

    try {
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = fence ? fence[1] : text;
      const parsed = JSON.parse(raw.trim()) as BriefSuggestion;
      return {
        title: String(parsed.title ?? "").slice(0, 120),
        description: String(parsed.description ?? "").slice(0, 2000),
        audience: String(parsed.audience ?? "").slice(0, 200),
      };
    } catch {
      throw new Error("L'IA n'a pas pu générer de suggestion. Réessayez.");
    }
  });
