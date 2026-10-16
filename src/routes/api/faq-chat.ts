import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai/ai-gateway.server";
import { log } from "@/lib/logger";
import { checkRateLimit, getRequestIp } from "@/lib/rateLimit.server";
import type { ChatAudience } from "@/components/app/FAQChatbot";

type ChatRequestBody = { messages?: unknown; audience?: ChatAudience; userContext?: string };

const KNOWLEDGE_BASE = `
MoveSpot est une marketplace française de publicité mobile qui met en relation :
- des PROPRIÉTAIRES de véhicules (food trucks, vans, taxis/VTC, scooters de livraison, voitures, vélos cargo, triporteurs, flottes d'entreprise) qui louent leurs espaces publicitaires
- des ANNONCEURS (entreprises) qui veulent diffuser leur publicité sur ces véhicules en mouvement
- des PRESTATAIRES spécialisés (covering, production vidéo, création graphique) référencés dans un annuaire
- des PARTENAIRES apporteurs d'affaires qui recommandent MoveSpot à des advertisers

ÉDITEUR : MoveSpot est édité par RAKOUN KLUB, entreprise individuelle (SIRET 804 671 444 00052, RCS Pointe-à-Pitre). TVA non applicable — franchise en base art. 293 B CGI. Contact général : contact@notify.move-spot.com.

════════════════════════════════════════
ESPACE PROPRIÉTAIRE
════════════════════════════════════════

INSCRIPTION (/owner/inscription) :
Renseigner nom, prénom, email, téléphone, ville. Connexion par email/mot de passe.

AJOUTER UN VÉHICULE (/owner/vehicules/nouveau) :
Renseigner : nom du véhicule, type (food truck, van, taxi, scooter, vélo cargo, voiture, triporteur…), format publicitaire, surface en m², km/jour moyens, prix/jour souhaité, photos. MoveSpot valide le véhicule sous 48h ouvrées.

STATUTS D'UN VÉHICULE :
- **En attente validation** : demande envoyée, en cours d'examen par MoveSpot
- **Approuvé** : véhicule visible sur la marketplace, campagnes possibles
- **Refusé** : ne respecte pas les critères (motif précisé dans la note admin)
- **En pause** : temporairement retiré de la marketplace

DEMANDES DE CAMPAGNE :
Onglet "Demandes reçues" dans le tableau de bord. Le propriétaire voit les demandes sur ses véhicules et peut **Accepter** ou **Refuser** chaque demande. Il voit les visuels de l'advertiser, les zones et les dates demandées.

REVENUS ET PAIEMENTS :
- MoveSpot prélève **30 % de commission** sur chaque campagne (le propriétaire touche **70 %**)
- Les paiements sont versés via **Stripe Connect** (widget à connecter depuis le tableau de bord)
- Renseigner un compte bancaire européen pour recevoir les virements

GESTION DE FLOTTE (/owner/flotte) :
- Vue globale de tous les véhicules
- Import CSV en masse : /owner/flotte/import
- QR codes par véhicule : /owner/flotte/qr (pratique pour l'identification terrain)

SUIVI GPS (/owner/tracking) :
Démarrer le suivi GPS en temps réel depuis le tableau de bord. Les advertisers peuvent suivre leur campagne en direct.

BRIEFS OUVERTS (/owner/briefs) :
Les advertisers publient des "briefs" : appels d'offres ouverts. Le propriétaire peut y répondre avec une proposition de véhicule.

════════════════════════════════════════
ESPACE ANNONCEUR
════════════════════════════════════════

INSCRIPTION (/advertiser/inscription) :
Renseigner nom, prénom, société, SIRET (optionnel), email, téléphone, adresse. Connexion par email/mot de passe.

TROUVER ET RÉSERVER UN EMPLACEMENT :
1. Page d'accueil → section véhicules (#spots) : parcourir les véhicules disponibles
2. Cliquer sur un véhicule → formulaire de réservation
3. Renseigner : dates de campagne, message, visuels publicitaires (fichiers créatifs)
4. MoveSpot valide sous **24h ouvrées**

STATUTS D'UNE CAMPAGNE :
- **En attente** : demande soumise, validation en cours
- **Validée** : campagne approuvée → passage au paiement
- **Refusée** : contenu non conforme ou véhicule indisponible (motif précisé)

PAIEMENT :
- Portefeuille MoveSpot : /advertiser/portefeuille
- Recharger par **carte bancaire** (Stripe) ou **virement bancaire**
- Une fois une campagne validée, payer directement depuis le tableau de bord avec le solde du portefeuille
- **Annulation** : gratuite jusqu'à 72h avant le début de la diffusion ; au-delà, 50 % du montant reste dû

PORTEFEUILLE (/advertiser/portefeuille) :
Solde visible en temps réel. Historique de toutes les transactions (recharges, paiements de campagnes, remboursements éventuels).

BRIEFS (/advertiser/briefs) :
Publier un brief = appel d'offres ouvert aux propriétaires. Spécifier : titre, description, types de véhicules souhaités, zones géographiques, budget maximum, dates.
- Statuts de brief : **Ouvert**, **Fermé**, **Pourvu**, **Annulé**
- Créer un nouveau brief : /advertiser/briefs/nouveau

SUIVI EN DIRECT (/advertiser/suivi) :
Suivre en temps réel le véhicule diffusant votre campagne sur une carte. Impressions estimées par jour affichées.

PRESTATAIRES COVERING (/providers) :
Annuaire des providers approuvés par MoveSpot pour la production des visuels : covering véhicule, production vidéo, création graphique.

CONTENUS PUBLICITAIRES INTERDITS (charte éditoriale MoveSpot) :
- Contenus à caractère religieux ou incitant à la haine religieuse
- Contenus sexistes ou à caractère pornographique
- Contenus incitant à la violence
- Contenus portant atteinte aux droits d'auteur ou à l'image de tiers

════════════════════════════════════════
ESPACE PRESTATAIRE
════════════════════════════════════════

INSCRIPTION (/provider/inscription) :
Renseigner société, prénom/nom, services proposés (covering, vidéo, graphisme…), zones d'intervention, description, tarifs, portfolio. Validation par MoveSpot avant apparition dans l'annuaire.

STATUTS DU COMPTE PRESTATAIRE :
- **En attente** : dossier soumis, en cours d'examen
- **Approuvé** : profil visible dans l'annuaire /providers
- **Refusé** : non conforme aux critères MoveSpot

ANNUAIRE (/providers) :
Accessible à tous. Recherche par service (covering, vidéo, graphisme) et par nom de société. Chaque fiche : société, services, zones, description, site web, infos de contact.

PORTFOLIO :
Le provider peut uploader des images de réalisations depuis son espace (/provider).

════════════════════════════════════════
ESPACE PARTENAIRE
════════════════════════════════════════

INSCRIPTION (/partner/inscription) :
Renseigner nom, prénom, société (optionnel), email, téléphone, ville. Code de parrainage attribué par MoveSpot après validation du profil.

PROGRAMME PARTENAIRE :
- Le partner recommande MoveSpot à des entreprises advertisers
- Pour chaque campagne lancée par un advertiser contacté grâce à lui, **une commission est reversée au partner**
- Pas de limite sur le nombre d'advertisers apportés
- Programme ouvert à tous : agents commerciaux, freelances, réseaux d'entreprises

ESPACE PARTENAIRE (/partner) :
Tableau de bord : profil, code de parrainage, liens d'invitation vers /advertiser/inscription.

Contact dédié programme partner : partners@move-spot.com

════════════════════════════════════════
RÉGLEMENTATION
════════════════════════════════════════

Conformément au Code de l'environnement (art. L.581-1 et suivants) et aux RLP communaux :
- Publicité lumineuse interdite dans agglomérations < 10 000 hab. hors unité urbaine > 100 000 hab.
- Interdite sur monuments historiques, immeubles classés, arbres, sites protégés
- Véhicules à usage principalement publicitaire : circulation et stationnement encadrés (art. R.581-48)
- MoveSpot vérifie la conformité de chaque campagne avant diffusion

════════════════════════════════════════
TARIFICATION
════════════════════════════════════════

- **Aucun abonnement** pour advertisers ou propriétaires
- Prix à la journée fixé librement par le propriétaire (fourchette recommandée affichée lors de l'ajout)
- **Commission MoveSpot : 30 %** sur chaque campagne ; **70 % reversés au propriétaire**
- Essai gratuit disponible pour certains formats

════════════════════════════════════════
CONTACTS ET PAGES LÉGALES
════════════════════════════════════════

- Contact général : contact@notify.move-spot.com
- Programme partner : partners@move-spot.com
- CGU : /cgu | CGV : /cgv | Confidentialité : /confidentialite
- Cookies : /cookies | Mentions légales : /mentions-legales | Sécurité : /securite
- Comment ça marche : /comment-ca-marche
`;

const AUDIENCE_CONTEXT: Record<ChatAudience, string> = {
  advertiser:
    "L'utilisateur est connecté en tant qu'**ANNONCEUR** sur son tableau de bord. Il gère ses campagnes, son portefeuille, ses briefs. Priorité : processus de réservation, paiement, statuts, suivi de campagne, providers covering.",
  owner:
    "L'utilisateur est connecté en tant que **PROPRIÉTAIRE** sur son tableau de bord. Il gère ses véhicules, traite les demandes de campagne, suit sa flotte. Priorité : validation de véhicule, demandes reçues, GPS, import CSV, QR codes, Stripe Connect, revenus.",
  partner:
    "L'utilisateur est connecté en tant que **PARTENAIRE APPORTEUR D'AFFAIRES**. Priorité : programme partner, commissions, comment recommander MoveSpot, contact partners@move-spot.com.",
  provider:
    "L'utilisateur est connecté en tant que **PRESTATAIRE** (covering, vidéo, graphisme). Priorité : profil, statut de validation, portfolio, visibilité dans l'annuaire /providers.",
};

export const Route = createFileRoute("/api/faq-chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Require a valid Supabase session (prevents unauthenticated AI token exhaustion)
        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response("Non authentifié", { status: 401 });
        }
        const token = authHeader.slice(7);
        const supabaseUrl = process.env["SUPABASE_URL"];
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (supabaseUrl && supabaseKey) {
          const { createClient } = await import("@supabase/supabase-js");
          const client = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          });
          const { data, error } = await client.auth.getClaims(token);
          if (error || !data?.claims?.sub) {
            return new Response("Non authentifié", { status: 401 });
          }
        }

        // Rate limit: 20 req/min par IP, 60 req/h par IP (protection coût IA)
        const ip = getRequestIp();
        if (
          !checkRateLimit(`faq:min:${ip}`, { maxRequests: 20, windowMs: 60_000 }) ||
          !checkRateLimit(`faq:hour:${ip}`, { maxRequests: 60, windowMs: 3_600_000 })
        ) {
          return new Response(
            JSON.stringify({ error: "Trop de requêtes. Réessayez dans quelques minutes." }),
            { status: 429, headers: { "Content-Type": "application/json" } },
          );
        }

        const { messages, audience, userContext } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages requis", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY ?? process.env.GOOGLE_AI_API_KEY;
        if (!key) {
          log.error("faq_chat_missing_key", new Error("LOVABLE_API_KEY not set"));
          return new Response("Clé IA manquante", { status: 500 });
        }

        const audienceCtx = audience ? AUDIENCE_CONTEXT[audience] : "";
        const today = new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        // Sanitize userContext: max 500 chars, strip potential injection
        const safeUserCtx =
          typeof userContext === "string"
            ? userContext.slice(0, 500).replace(/[<>{}[\]]/g, "")
            : "";

        try {
          const gateway = createLovableAiGatewayProvider(key);
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: `Tu es l'assistant officiel de MoveSpot, une marketplace française de publicité mobile sur véhicules.
Date d'aujourd'hui : ${today}.

RÈGLES ABSOLUES :
1. Réponds UNIQUEMENT en français.
2. Sois concis et direct : 2 à 4 phrases sauf si l'utilisateur demande des détails.
3. Base-toi STRICTEMENT sur la base de connaissances ci-dessous. Ne jamais inventer de tarifs, de délais ou d'engagements non mentionnés.
4. Si la question dépasse ton périmètre, dis poliment que tu n'as pas l'info et renvoie vers contact@notify.move-spot.com.
5. Quand c'est utile, indique la page de l'application à visiter en format lien court (ex: **/advertiser/portefeuille**).
6. Utilise du **markdown léger** (gras, listes courtes) pour structurer les réponses longues.
7. Sois chaleureux et professionnel, jamais robotique ni répétitif.
8. Si l'utilisateur a un contexte spécifique (solde, campagnes), prends-le en compte pour personnaliser ta réponse.

PROFIL DE L'UTILISATEUR :
${audienceCtx}
${safeUserCtx ? `\nINFOS COMPTE EN TEMPS RÉEL :\n${safeUserCtx}` : ""}

=== BASE DE CONNAISSANCES MOVESPOT ===
${KNOWLEDGE_BASE}`,
            messages: await convertToModelMessages(messages as UIMessage[]),
            onError: ({ error }) => {
              log.error("faq_chat_stream_error", error, { audience: audience ?? "unknown" });
            },
          });

          return result.toUIMessageStreamResponse();
        } catch (err) {
          log.error("faq_chat_fatal", err, { audience: audience ?? "unknown" });
          return new Response(JSON.stringify({ error: "Service IA temporairement indisponible" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
