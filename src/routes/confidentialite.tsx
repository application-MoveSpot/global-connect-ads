import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — MoveSpot" },
      { name: "description", content: "Politique de confidentialité MoveSpot : collecte, traitement et protection de vos données personnelles selon le RGPD." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage eyebrow="RGPD" title="Politique de confidentialité" updatedAt="30 mai 2026">
      <LegalSection title="1. Préambule">
        <p>
          MoveSpot accorde une importance particulière à la protection des données personnelles. La présente politique
          décrit la manière dont vos données sont collectées, utilisées et protégées, conformément au Règlement
          Général sur la Protection des Données (UE 2016/679, « RGPD ») et à la loi Informatique et Libertés modifiée.
        </p>
      </LegalSection>

      <LegalSection title="2. Responsable du traitement">
        <p>
          Le responsable du traitement est la société MoveSpot.
          Pour toute question relative à vos données, contactez-nous à
          <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline"> contact@notify.move-spot.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Données collectées">
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Données d'identification</strong> : nom, prénom, raison sociale, fonction.</li>
          <li><strong>Données de contact</strong> : adresse email professionnelle, téléphone.</li>
          <li><strong>Données de campagne</strong> : contenu publicitaire soumis, emplacement réservé, dates.</li>
          <li><strong>Données de connexion</strong> : adresse IP, type de navigateur, pages visitées, horodatage.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Finalités et bases légales">
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left p-3 font-medium">Finalité</th>
              <th className="text-left p-3 font-medium">Base légale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="p-3">Gestion des réservations d'emplacements</td><td className="p-3">Exécution du contrat</td></tr>
            <tr><td className="p-3">Modération du contenu publicitaire</td><td className="p-3">Intérêt légitime</td></tr>
            <tr><td className="p-3">Facturation et obligations comptables</td><td className="p-3">Obligation légale</td></tr>
            <tr><td className="p-3">Envoi d'informations commerciales</td><td className="p-3">Consentement</td></tr>
            <tr><td className="p-3">Mesure d'audience et statistiques</td><td className="p-3">Consentement (cookies)</td></tr>
          </tbody>
        </table>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <ul className="list-disc pl-6 space-y-2">
          <li>Données client actif : pendant toute la durée de la relation contractuelle.</li>
          <li>Données comptables : 10 ans (obligation légale).</li>
          <li>Données prospects : 3 ans à compter du dernier contact.</li>
          <li>Logs techniques : 12 mois maximum.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Destinataires">
        <p>
          Vos données sont destinées aux équipes internes de MoveSpot (commerciales, modération, comptabilité) et,
          le cas échéant, à nos sous-traitants techniques (hébergement, paiement, envoi d'emails). Tous nos
          sous-traitants sont liés par des engagements de confidentialité et de sécurité conformes au RGPD.
        </p>
      </LegalSection>

      <LegalSection title="7. Transferts hors UE">
        <p>
          Certains de nos prestataires peuvent être situés en dehors de l'Union européenne. Dans ce cas, nous nous
          assurons que des garanties appropriées sont mises en place (clauses contractuelles types de la Commission
          européenne, décision d'adéquation).
        </p>
      </LegalSection>

      <LegalSection title="8. Vos droits">
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Droit d'accès, de rectification et d'effacement de vos données ;</li>
          <li>Droit à la limitation et à l'opposition au traitement ;</li>
          <li>Droit à la portabilité de vos données ;</li>
          <li>Droit de retirer votre consentement à tout moment ;</li>
          <li>Droit de définir des directives post mortem ;</li>
          <li>Droit d'introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr" className="text-primary hover:underline">www.cnil.fr</a>).</li>
        </ul>
        <p>
          Pour exercer vos droits, écrivez-nous à
          <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline"> contact@notify.move-spot.com</a>.
          Une réponse vous sera apportée dans un délai maximum d'un mois.
        </p>
      </LegalSection>

      <LegalSection title="9. Sécurité">
        <p>
          MoveSpot met en œuvre toutes les mesures techniques et organisationnelles appropriées pour garantir la
          sécurité de vos données : chiffrement des échanges (HTTPS/TLS), contrôle des accès, sauvegardes régulières,
          audits de sécurité.
        </p>
      </LegalSection>

      <LegalSection title="10. Modifications">
        <p>
          La présente politique peut être mise à jour à tout moment. Toute modification substantielle vous sera
          notifiée par email ou via la Plateforme.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
