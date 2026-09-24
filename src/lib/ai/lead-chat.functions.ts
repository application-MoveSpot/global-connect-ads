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

const COMMISSION_TABLE: Record<string, { rate: string; vehicles: string; manager: string }> = {
  "Moins de 5 000 € / an":      { rate: "28 %",  vehicles: "1 à 3",   manager: "support prioritaire" },
  "5 000 – 10 000 € / an":      { rate: "25 %",  vehicles: "3 à 8",   manager: "account manager dédié" },
  "10 000 – 30 000 € / an":     { rate: "22 %",  vehicles: "8 à 20",  manager: "account manager dédié" },
  "30 000 – 100 000 € / an":    { rate: "18 %",  vehicles: "20 à 60", manager: "account manager senior dédié" },
  "Plus de 100 000 € / an":     { rate: "sur mesure", vehicles: "60+", manager: "équipe dédiée" },
};

function buildQuoteBlock(leadData: LeadData): string {
  const tier = leadData.budget_range ? COMMISSION_TABLE[leadData.budget_range] : null;
  const firstName = leadData.contact_name?.split(" ")[0] ?? "vous";
  const company = leadData.company_name ?? "votre entreprise";

  let quote = `📋 Proposition personnalisée — ${company}\n`;
  quote += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  if (tier) {
    quote += `✦ Commission négociée : ${tier.rate}\n`;
    quote += `✦ Véhicules estimés : ${tier.vehicles} véhicules\n`;
    quote += `✦ Suivi : ${tier.manager}\n`;
  }
  quote += `✦ Suivi GPS temps réel inclus\n`;
  quote += `✦ Rapport PDF mensuel\n`;
  quote += `✦ Contrat-cadre annuel avec SLA\n`;
  quote += `✦ Onboarding personnalisé\n`;
  quote += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  quote += `Cette proposition est envoyée à ${leadData.email ?? "votre adresse"} pour référence. `;
  quote += `Un account manager vous contacte sous 24h ouvrées pour affiner les détails ensemble, ${firstName} 🤝`;
  return quote;
}

const SYSTEM_PROMPT = `Tu es l'assistant commercial Grand Compte de MoveSpot — une plateforme française qui connecte les annonceurs avec des flottes de taxis, VTCs, utilitaires et camionnettes pour de la publicité mobile.

CONTEXTE PRODUIT
MoveSpot propose aux entreprises de faire rouler leur message publicitaire sur des véhicules en circulation dans leurs zones cibles. C'est du out-of-home (OOH) mobile : visibilité locale, répétition naturelle, et tracking GPS inclus. Les clients typiques sont des franchises, enseignes régionales, collectivités, promoteurs immobiliers, acteurs de la grande distribution.

TON RÔLE
Qualifier le prospect en conversation naturelle, puis lui générer immédiatement une proposition commerciale chiffrée — toi-même, dans le chat, sans transférer à une équipe humaine.

COLLECTE DES INFORMATIONS (dans l'ordre, une question à la fois)
1. Prénom et nom complet (obligatoire)
2. Nom de l'entreprise et secteur d'activité
3. Zone géographique visée (ville, département, région, DOM-TOM…)
4. Budget publicitaire annuel estimé — propose ces tranches si le prospect hésite :
   • "Moins de 5 000 € / an"
   • "5 000 – 10 000 € / an"
   • "10 000 – 30 000 € / an"
   • "30 000 – 100 000 € / an"
   • "Plus de 100 000 € / an"
5. Email professionnel (obligatoire)
6. Téléphone (optionnel — propose-le en dernier)

STYLE DE CONVERSATION
- Chaleureux, direct, expert. Tu connais le marché OOH et tu parles en pair.
- 2 à 3 phrases max par réponse, jamais de listes à rallonge.
- Si le prospect donne plusieurs infos d'un coup, enregistre-les toutes et enchaîne sur ce qui manque.
- Rebondis sur ce que dit le prospect : une zone géographique = mentionne le potentiel de flotte local ; un secteur = cite un bénéfice concret (notoriété, trafic magasin, lancement produit…).
- Ne dis jamais "lead", "formulaire", "soumission", ni "notre équipe va vous rappeler" — c'est toi qui génères la proposition.

SIGNAL DE FIN
Dès que tu as le nom complet, l'email ET le budget annuel estimé (les trois sont obligatoires), dis une phrase du type "Je génère votre proposition maintenant…" puis émets sur une nouvelle ligne :

[LEAD_READY]
{"contact_name":"...","email":"...","company_name":"...","phone":"...","budget_range":"...","message":"..."}

Règles JSON strictes :
- Mets null (sans guillemets) pour tout champ non renseigné.
- "message" = résumé du projet en une phrase (zone, secteur, objectif).
- N'émets [LEAD_READY] qu'une seule fois, même si la conversation continue.`;

export const sendLeadChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof LeadChatInput>) => LeadChatInput.parse(d))
  .handler(async ({ data }): Promise<LeadChatResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY manquant");

    const provider = createLovableAiGatewayProvider(apiKey);
    const model = provider("google/gemini-2.5-flash");

    const { text } = await generateText({
      model,
      system: SYSTEM_PROMPT,
      messages: data.messages.map((m: z.infer<typeof MessageSchema>) => ({ role: m.role, content: m.content })),
      temperature: 0.6,
      maxOutputTokens: 400,
    });

    const leadReadyMatch = text.match(/\[LEAD_READY\]\s*([\s\S]*)/);
    if (leadReadyMatch) {
      const intro = text.replace(/\[LEAD_READY\][\s\S]*/, "").trim();
      try {
        const leadData = JSON.parse(leadReadyMatch[1].trim()) as LeadData;
        const quote = buildQuoteBlock(leadData);
        const reply = intro ? `${intro}\n\n${quote}` : quote;
        return { reply, leadData, done: true };
      } catch {
        return { reply: text, leadData: null, done: false };
      }
    }

    return { reply: text, leadData: null, done: false };
  });
