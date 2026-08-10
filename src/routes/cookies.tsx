import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Politique relative aux cookies — MoveSpot" },
      { name: "description", content: "Comment MoveSpot utilise les cookies et traceurs, et comment gérer vos préférences." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: Cookies,
});

function Cookies() {
  return (
    <LegalPage eyebrow="Traceurs" title="Politique relative aux cookies" updatedAt="11 août 2026">
      <LegalSection title="1. Qu'est-ce qu'un cookie ?">
        <p>
          Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de
          la consultation d'un site web. Il permet de stocker des informations relatives à votre navigation et
          d'améliorer votre expérience utilisateur.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies utilisés sur MoveSpot">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Finalité</th>
              <th className="text-left p-3 font-medium">Durée</th>
              <th className="text-left p-3 font-medium">Consentement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr>
              <td className="p-3">Strictement nécessaires</td>
              <td className="p-3">Fonctionnement du site, session utilisateur, sécurité</td>
              <td className="p-3">Session</td>
              <td className="p-3">Non requis</td>
            </tr>
            <tr>
              <td className="p-3">Authentification</td>
              <td className="p-3">Maintien de la session connectée et de l'authentification à deux facteurs (TOTP)</td>
              <td className="p-3">Jusqu'à 30 jours</td>
              <td className="p-3">Non requis</td>
            </tr>
            <tr>
              <td className="p-3">Stockage local technique</td>
              <td className="p-3">Mémoire tampon des positions GPS du chauffeur avant envoi par lots (aucune lecture publicitaire)</td>
              <td className="p-3">Jusqu'à l'envoi</td>
              <td className="p-3">Non requis</td>
            </tr>
            <tr>
              <td className="p-3">Préférences</td>
              <td className="p-3">Mémorisation de la langue et des choix d'affichage</td>
              <td className="p-3">12 mois</td>
              <td className="p-3">Requis</td>
            </tr>
            <tr>
              <td className="p-3">Mesure d'audience</td>
              <td className="p-3">Statistiques de fréquentation et performance</td>
              <td className="p-3">13 mois</td>
              <td className="p-3">Requis</td>
            </tr>
            <tr>
              <td className="p-3">Tiers (cartographie)</td>
              <td className="p-3">Affichage des cartes interactives et du dessin de zone (Mapbox)</td>
              <td className="p-3">Variable</td>
              <td className="p-3">Requis</td>
            </tr>
            <tr>
              <td className="p-3">Tiers (paiement)</td>
              <td className="p-3">Sécurisation du tunnel de paiement et prévention de la fraude (Stripe)</td>
              <td className="p-3">Variable</td>
              <td className="p-3">Non requis (nécessaire au paiement)</td>
            </tr>
          </tbody>

        </table>
      </LegalSection>

      <LegalSection title="3. Vos choix">
        <p>
          Lors de votre première visite, un bandeau vous permet d'accepter, refuser ou personnaliser les cookies non
          essentiels. Vous pouvez à tout moment modifier vos préférences via le lien « Gérer mes cookies » présent en
          pied de page.
        </p>
      </LegalSection>

      <LegalSection title="4. Paramétrage via votre navigateur">
        <p>
          Vous pouvez également configurer votre navigateur pour bloquer ou supprimer les cookies. La désactivation
          de certains cookies peut toutefois altérer le bon fonctionnement de la Plateforme.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><a href="https://support.google.com/chrome/answer/95647" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Apple Safari</a></li>
          <li><a href="https://support.microsoft.com/fr-fr/microsoft-edge" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Microsoft Edge</a></li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Durée de conservation du consentement">
        <p>
          Votre choix concernant les cookies est conservé pendant 6 mois. Au terme de cette période, le bandeau de
          consentement vous sera de nouveau présenté.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          Pour toute question relative à cette politique cookies, contactez-nous à
          <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline"> contact@notify.move-spot.com</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
