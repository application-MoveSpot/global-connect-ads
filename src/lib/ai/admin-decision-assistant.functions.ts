import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { captureServerException } from "@/lib/sentry.server";

const AdminDecisionInput = z.object({
  entityType: z.enum(["vehicle", "brief", "poseur"]),
  entityName: z.string().max(200),
  entityDetails: z.string().max(800).optional(),
  aiVerificationNotes: z.string().max(500).optional(),
});

export type AdminDecisionResult = { ok: true; note: string } | { ok: false; message: string };

const PROMPTS: Record<string, (d: z.infer<typeof AdminDecisionInput>) => string> = {
  vehicle: (
    d,
  ) => `Tu es un modérateur de la plateforme MoveSpot (publicité mobile sur véhicules en France).
Tu dois rédiger une note de refus professionnelle et bienveillante pour un véhicule qui ne remplit pas les critères d'acceptation.
La note doit être courte (2 à 3 phrases), expliquer le motif principal de refus, et inviter le propriétaire à corriger et soumettre à nouveau si possible.
Ne commence pas par "Bonjour".

Véhicule : ${d.entityName}
${d.entityDetails ? `Détails : ${d.entityDetails}` : ""}
${d.aiVerificationNotes ? `Vérification IA : ${d.aiVerificationNotes}` : ""}

Réponds uniquement avec le texte de la note, sans titre ni formatage.`,

  brief: (
    d,
  ) => `Tu es un modérateur de la plateforme MoveSpot (publicité mobile sur véhicules en France).
Tu dois rédiger une note de refus professionnelle et bienveillante pour un brief publicitaire qui ne respecte pas les conditions de la plateforme.
La note doit être courte (2 à 3 phrases), expliquer le motif principal de refus, et guider l'annonceur pour corriger son brief.
Ne commence pas par "Bonjour".

Brief : ${d.entityName}
${d.entityDetails ? `Détails : ${d.entityDetails}` : ""}
${d.aiVerificationNotes ? `Analyse IA : ${d.aiVerificationNotes}` : ""}

Réponds uniquement avec le texte de la note, sans titre ni formatage.`,

  poseur: (
    d,
  ) => `Tu es un modérateur de la plateforme MoveSpot (publicité mobile sur véhicules en France).
Tu dois rédiger une note de refus professionnelle et bienveillante pour un dossier de certification de poseur (installateur de publicités).
La note doit être courte (2 à 3 phrases), expliquer le motif de refus de la certification, et indiquer ce qui peut être amélioré pour une prochaine demande.
Ne commence pas par "Bonjour".

Poseur : ${d.entityName}
${d.entityDetails ? `Détails : ${d.entityDetails}` : ""}

Réponds uniquement avec le texte de la note, sans titre ni formatage.`,
};

export const generateAdminDecisionNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof AdminDecisionInput>) => AdminDecisionInput.parse(d))
  .handler(async ({ data, context }): Promise<AdminDecisionResult> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { ok: false, message: "Accès réservé aux administrateurs." };

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { ok: false, message: "Service IA indisponible." };

    const prompt = PROMPTS[data.entityType](data);

    try {
      const { generateText } = await import("ai");
      const provider = createLovableAiGatewayProvider(apiKey);
      const model = provider("google/gemini-2.5-flash");
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.3,
        maxOutputTokens: 200,
      });
      const note = text.trim();
      if (!note) return { ok: false, message: "L'IA n'a pas pu générer de note. Réessayez." };
      return { ok: true, note };
    } catch (err) {
      captureServerException(err, { category: "ai" });
      return { ok: false, message: "L'IA n'a pas pu générer de note. Réessayez." };
    }
  });
