import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { assertRateLimit } from "@/lib/rateLimit.server";
import { captureServerException } from "@/lib/sentry.server";
import { generateText } from "ai";

const Input = z.object({
  briefTitle: z.string().max(200),
  lastMessages: z
    .array(
      z.object({
        role: z.enum(["owner", "advertiser", "admin"]),
        body: z.string().max(500),
      }),
    )
    .max(6),
  context: z
    .object({
      vehicleType: z.string().optional(),
      zones: z.array(z.string()).optional(),
      pricePerDay: z.number().optional(),
    })
    .optional(),
});

export type SmartReply = {
  label: string;
  body: string;
  tone: "accept" | "propose" | "clarify" | "decline";
};

export const generateSmartReplies = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof Input>) => Input.parse(d))
  .handler(async ({ data, context }): Promise<SmartReply[]> => {
    assertRateLimit(`smart-replies:${context.userId}`, { maxRequests: 60, windowMs: 60_000 });

    const apiKey = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) throw new Error("Service IA indisponible");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const lastMsg = data.lastMessages.at(-1);
    const history = data.lastMessages
      .map((m) => `[${m.role === "advertiser" ? "Annonceur" : "Moi"}]: ${m.body}`)
      .join("\n");

    const vehicleCtx = data.context
      ? `Véhicule : ${data.context.vehicleType ?? "non précisé"}, zones : ${(data.context.zones ?? []).join(", ") || "non précisées"}, tarif : ${data.context.pricePerDay ? `${data.context.pricePerDay}€/j` : "non précisé"}`
      : "";

    const prompt = `Tu es un propriétaire de flotte publicitaire sur la plateforme MoveSpot.
Tu dois répondre à un annonceur de façon professionnelle, concise et commerciale.

Brief : "${data.briefTitle}"
${vehicleCtx}

Historique de la conversation :
${history}

Dernier message de l'annonceur :
"${lastMsg?.body ?? ""}"

Génère exactement 3 suggestions de réponse courtes (max 80 mots chacune) avec des tons différents.
Retourne UNIQUEMENT un JSON :
[
  { "label": "✅ Accepter", "body": "...", "tone": "accept" },
  { "label": "🕐 Proposer alternative", "body": "...", "tone": "propose" },
  { "label": "❓ Demander précision", "body": "...", "tone": "clarify" }
]

Règles :
- Chaque réponse doit être en français, naturelle, professionnelle
- body = texte de la réponse prêt à envoyer (pas de placeholder)
- label = bouton court (3-5 mots max)
- Adapte les suggestions au dernier message reçu
- JSON pur, sans markdown`;

    try {
      const { text } = await generateText({
        model,
        prompt,
        temperature: 0.5,
        maxOutputTokens: 500,
      });

      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const raw = (fence ? fence[1] : text).trim();
      const parsed = JSON.parse(raw) as SmartReply[];

      return parsed.slice(0, 3).map((r) => ({
        label: String(r.label ?? "Répondre").slice(0, 40),
        body: String(r.body ?? "").slice(0, 400),
        tone: (["accept", "propose", "clarify", "decline"] as const).includes(r.tone)
          ? r.tone
          : "clarify",
      }));
    } catch (err) {
      captureServerException(err, { category: "ai", userId: context.userId });
      return [
        {
          label: "✅ Accepter",
          body: "Bonjour, je suis disponible pour cette mission. Pouvons-nous finaliser les détails ?",
          tone: "accept",
        },
        {
          label: "🕐 Autre horaire",
          body: "Je suis intéressé mais aurais-vous de la flexibilité sur les dates ? Je vous propose d'en discuter.",
          tone: "propose",
        },
        {
          label: "❓ Précisions",
          body: "Merci pour votre message. Pourriez-vous me donner plus de détails sur vos attentes ?",
          tone: "clarify",
        },
      ];
    }
  });
