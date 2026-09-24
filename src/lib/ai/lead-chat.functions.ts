import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});

const LeadChatInput = z.object({
  messages: z.array(MessageSchema).max(40),
});

export type LeadData = {
  contact_name: string | null;
  email: string | null;
  company_name: string | null;
  phone: string | null;
  budget_range: string | null;
  message: string | null;
};

export type LeadChatResult = {
  reply: string;
  leadData: LeadData | null;
  done: boolean;
};

const SYSTEM_PROMPT = `Tu es l'assistant commercial de MoveSpot, une plateforme française de publicité mobile sur véhicules (taxis, VTCs, utilitaires, camionnettes).

Ton rôle : qualifier chaleureusement les prospects Grande Entreprise / Réseau qui souhaitent une offre sur devis personnalisée.

Informations à collecter dans l'ordre naturel :
1. Prénom et nom complet (obligatoire)
2. Email professionnel (obligatoire)
3. Nom de l'entreprise
4. Téléphone
5. Budget annuel estimé — propose ces tranches si utile : "Moins de 5 000 € / an", "5 000 – 10 000 € / an", "10 000 – 30 000 € / an", "30 000 – 100 000 € / an", "Plus de 100 000 € / an"
6. Description du projet et des objectifs

Instructions de conduite :
- Sois chaleureux, professionnel, concis. 2 à 4 phrases max par réponse.
- Pose une seule question à la fois.
- Si l'utilisateur donne plusieurs infos d'un coup, enregistre-les toutes et passe directement aux infos manquantes.
- Présente-toi brièvement au début et demande le nom + entreprise.
- Ne parle pas de "lead", "formulaire" ou "soumission" — dis simplement que tu transmets à l'équipe commerciale.
- Quand tu as AU MINIMUM le nom complet ET l'email : rédige un message de confirmation chaleureux (ex : "Parfait ! Je transmets votre demande à notre équipe commerciale, vous serez recontacté(e) sous 24h ouvrées."), puis, sur une NOUVELLE ligne, ajoute exactement ce bloc JSON (rien d'autre après) :

[LEAD_READY]
{"contact_name":"...","email":"...","company_name":"...","phone":"...","budget_range":"...","message":"..."}

Mets null (sans guillemets) pour les champs non renseignés.
Ne génère [LEAD_READY] qu'une seule fois, uniquement quand tu as le nom + email.`;

export const sendLeadChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof LeadChatInput>) => LeadChatInput.parse(d))
  .handler(async ({ data }): Promise<LeadChatResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.0-flash");

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: data.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.6,
      maxOutputTokens: 400,
    });

    const leadReadyMatch = text.match(/\[LEAD_READY\]\s*([\s\S]*)/);
    if (leadReadyMatch) {
      const visibleText = text.replace(/\[LEAD_READY\][\s\S]*/, "").trim();
      try {
        const leadData = JSON.parse(leadReadyMatch[1].trim()) as LeadData;
        return { reply: visibleText, leadData, done: true };
      } catch {
        return { reply: text, leadData: null, done: false };
      }
    }

    return { reply: text, leadData: null, done: false };
  });
