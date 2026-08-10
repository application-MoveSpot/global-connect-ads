import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatRequestBody = { messages?: unknown; audience?: "proprietaire" | "annonceur" };

const KNOWLEDGE_BASE = `
MoveSpot est une marketplace française de publicité mobile qui met en relation :
- des PROPRIÉTAIRES de véhicules (food trucks, vans, taxis/VTC, scooters de livraison, voitures, vélos cargo, vélos remorques, triporteurs, tutuks, flottes d'entreprise)
- avec des ANNONCEURS qui veulent diffuser leur publicité sur ces véhicules en mouvement.

ÉDITEUR : MoveSpot est édité par RAKOUN KLUB, entreprise individuelle (SIRET 804 671 444 00052, RCS Pointe-à-Pitre). TVA non applicable (franchise en base, art. 293 B CGI). Contact : contact@notify.move-spot.com.

POUR LES PROPRIÉTAIRES :
1. Inscription en 2 minutes sur /proprietaire/inscription
2. Ajout d'un véhicule avec photos, format publicitaire, surface, km/jour, prix/jour
3. Validation du véhicule par MoveSpot sous 48h
4. Réception de demandes de campagnes — le propriétaire accepte ou refuse chaque demande
5. Revenu passif sur les trajets quotidiens

POUR LES ANNONCEURS :
1. Inscription sur /annonceur/inscription
2. Recherche d'emplacements selon la ville, le format, le volume d'impressions
3. Réservation via formulaire de demande
4. Validation du contenu publicitaire par MoveSpot sous 24h ouvrées (charte : pas de contenu religieux, sexiste, pornographique ou violent)
5. Paiement à la confirmation (CB ou virement). Annulation gratuite jusqu'à 72h avant diffusion, ensuite 50% dû.

RÉGLEMENTATION (Code de l'environnement, art. L.581-1 et suivants, RLP communal) :
- Publicité lumineuse interdite dans agglomérations < 10 000 habitants hors unité urbaine > 100 000 hab.
- Interdite sur monuments historiques, immeubles classés, arbres, sites protégés.
- Véhicules à usage principalement publicitaire : circulation/stationnement encadrés (art. R.581-48).
- MoveSpot vérifie la conformité de chaque campagne.

PAGES UTILES : /devenir-partenaire, /annonceur, /pitch, /cgu, /cgv, /confidentialite, /cookies, /mentions-legales.
`;

export const Route = createFileRoute("/api/faq-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, audience } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages requis", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Clé IA manquante", { status: 500 });

        const audienceContext =
          audience === "annonceur"
            ? "L'utilisateur est sur la page Annonceur (il veut diffuser de la pub)."
            : audience === "proprietaire"
              ? "L'utilisateur est sur la page Devenir partenaire (il possède un véhicule)."
              : "";

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: `Tu es l'assistant FAQ officiel de MoveSpot. Réponds UNIQUEMENT en français, de manière concise (2-4 phrases max sauf si on te demande des détails), chaleureuse et professionnelle.

${audienceContext}

Base-toi STRICTEMENT sur les informations ci-dessous. Si la question sort de ce périmètre, dis poliment que tu n'as pas l'info et invite à contacter contact@notify.move-spot.com.

Ne jamais inventer de tarifs, de chiffres ou d'engagements. Utilise du markdown léger (gras, listes courtes) si utile.

=== BASE DE CONNAISSANCES MOVESPOT ===
${KNOWLEDGE_BASE}`,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});
