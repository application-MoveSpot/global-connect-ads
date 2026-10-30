import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { captureServerException } from "@/lib/sentry.server";

const FeasibilityInput = z.object({
  serviceType: z.string().max(100),
  vehicleType: z.string().max(100).optional(),
  answers: z.record(z.string().max(500)).max(15),
  providerServices: z.array(z.string().max(100)).max(10),
  providerDescription: z.string().max(1000).optional(),
});

export type FeasibilityBreakdown = {
  score: number; // 0-100
  vehicleCompatible: boolean;
  constraintsFeasible: boolean;
  skillsMatch: boolean;
  notes: string[];
};

export type FeasibilityResult =
  { ok: true; data: FeasibilityBreakdown } | { ok: false; message: string };

const FALLBACK_SCORE: FeasibilityBreakdown = {
  score: 75,
  vehicleCompatible: true,
  constraintsFeasible: true,
  skillsMatch: true,
  notes: ["Analyse automatique indisponible — évaluez manuellement le brief."],
};

export const computeFeasibilityScore = createServerFn({ method: "POST" })
  .validator((d: z.infer<typeof FeasibilityInput>) => FeasibilityInput.parse(d))
  .handler(async ({ data }): Promise<FeasibilityResult> => {
    const platformKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!platformKey) return { ok: true, data: FALLBACK_SCORE };

    const answersText = Object.entries(data.answers)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `- ${k} : ${v}`)
      .join("\n");

    const prompt = `Tu es un expert en communication visuelle sur véhicules publicitaires.
Analyse la faisabilité d'une demande de devis pour un prestataire.

DEMANDE CLIENT :
- Type de service : ${data.serviceType}
${data.vehicleType ? `- Type de véhicule : ${data.vehicleType}` : ""}
- Réponses questionnaire :
${answersText || "(aucune réponse enregistrée)"}

PROFIL PRESTATAIRE :
- Services déclarés : ${data.providerServices.join(", ") || "non précisés"}
${data.providerDescription ? `- Description : ${data.providerDescription}` : ""}

Évalue la cohérence et la faisabilité. Réponds UNIQUEMENT avec un objet JSON valide (sans markdown) :
{
  "score": <entier 0-100>,
  "vehicleCompatible": <true|false>,
  "constraintsFeasible": <true|false>,
  "skillsMatch": <true|false>,
  "notes": [<1 à 3 observations courtes en français, max 60 chars chacune>]
}`;

    try {
      const provider = createLovableAiGatewayProvider(platformKey);
      const { generateText } = await import("ai");
      const { text } = await generateText({
        model: provider("google/gemini-2.5-flash-lite"),
        prompt,
        temperature: 0.2,
        maxOutputTokens: 200,
      });

      const raw = text
        .trim()
        .replace(/^```json\s*|```$/g, "")
        .trim();
      const parsed = JSON.parse(raw) as FeasibilityBreakdown;

      // Sanitize
      const score = Math.min(100, Math.max(0, Number(parsed.score) || 75));
      return {
        ok: true,
        data: {
          score,
          vehicleCompatible: Boolean(parsed.vehicleCompatible),
          constraintsFeasible: Boolean(parsed.constraintsFeasible),
          skillsMatch: Boolean(parsed.skillsMatch),
          notes: Array.isArray(parsed.notes) ? parsed.notes.slice(0, 3).map(String) : [],
        },
      };
    } catch (err) {
      captureServerException(err, { category: "ai", extra: { service: "feasibility-score" } });
      return { ok: true, data: FALLBACK_SCORE };
    }
  });
