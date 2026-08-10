import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — MoveSpot" },
      { name: "description", content: "Politique de confidentialité MoveSpot : données de géolocalisation, paiements, authentification à deux facteurs et droits RGPD." },
      { property: "og:title", content: "Politique de confidentialité — MoveSpot" },
      { property: "og:description", content: "Comment MoveSpot collecte, utilise et protège vos données, y compris les positions GPS de campagne." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/confidentialite" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <LegalPage eyebrow="RGPD" title="Politique de confidentialité" updatedAt="11 août 2026">
      <LegalSection title="1. Préambule">
        <p>
          MoveSpot accorde une importance particulière à la protection des données personnelles. La présente politique
          décrit la manière dont vos données sont collectées, utilisées et protégées, conformément au Règlement
          Général sur la Protection des Données (UE 2016/679, « RGPD ») et à la loi Informatique et Libertés modifiée.
        </p>
      </LegalSection>

      <LegalSection title="2. Responsable du traitement">
        <p>
          Le responsable du traitement est RAKOUN KLUB, entreprise individuelle exploitant MoveSpot (voir les{" "}
          <a href="/mentions-legales" className="text-primary hover:underline">mentions légales</a>).
          Pour toute question relative à vos données, contactez-nous à
          <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline"> contact@notify.move-spot.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Données collectées">
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Données d'identification</strong> : nom, prénom, dénomination ou nom du chef d'entreprise, fonction, SIREN/SIRET.</li>
          <li><strong>Données de contact</strong> : adresse email, téléphone, adresse de correspondance.</li>
          <li><strong>Données de compte et de sécurité</strong> : identifiants, journaux de connexion, secret d'authentification à deux facteurs (TOTP) et facteurs enregistrés.</li>
          <li><strong>Données de campagne</strong> : brief, zone de diffusion dessinée, créations publicitaires, vidéos, dates.</li>
          <li><strong>Données de véhicule et de pose</strong> : caractéristiques, photographies du véhicule et photographies de contrôle de pose (avant, côtés, arrière).</li>
          <li><strong>Données de géolocalisation</strong> : positions GPS horodatées transmises pendant les périodes de conduite déclarées, et métriques agrégées (distance, minutes actives, taux de couverture de zone).</li>
          <li><strong>Données de paiement</strong> : historique de transactions, solde de portefeuille, statut du compte de paiement et références de virement. Les numéros de carte ne sont jamais traités ni stockés par MoveSpot.</li>
          <li><strong>Données de connexion technique</strong> : adresse IP, type de navigateur, pages visitées, horodatage.</li>
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
            <tr><td className="p-3">Gestion des briefs, campagnes et mise en relation</td><td className="p-3">Exécution du contrat</td></tr>
            <tr><td className="p-3">Suivi de diffusion par géolocalisation et calcul des métriques</td><td className="p-3">Exécution du contrat</td></tr>
            <tr><td className="p-3">Contrôle de la pose du support (photographies)</td><td className="p-3">Exécution du contrat</td></tr>
            <tr><td className="p-3">Modération du contenu publicitaire et des véhicules</td><td className="p-3">Intérêt légitime</td></tr>
            <tr><td className="p-3">Paiements, reversements et lutte contre la fraude</td><td className="p-3">Exécution du contrat / Obligation légale</td></tr>
            <tr><td className="p-3">Authentification à deux facteurs et sécurité des comptes</td><td className="p-3">Intérêt légitime / Obligation de sécurité</td></tr>
            <tr><td className="p-3">Vérification d'identité d'entreprise (SIRET)</td><td className="p-3">Intérêt légitime</td></tr>
            <tr><td className="p-3">Facturation et obligations comptables</td><td className="p-3">Obligation légale</td></tr>
            <tr><td className="p-3">Envoi d'informations commerciales</td><td className="p-3">Consentement</td></tr>
            <tr><td className="p-3">Mesure d'audience et statistiques</td><td className="p-3">Consentement (cookies)</td></tr>
          </tbody>
        </table>
      </LegalSection>

      <LegalSection title="5. Géolocalisation : périmètre et garanties">
        <p>
          Les positions GPS sont collectées uniquement lorsque le chauffeur active le suivi, et uniquement pendant les
          périodes de conduite déclarées d'une campagne. Elles sont mises en mémoire tampon sur le terminal puis
          envoyées par lots à la Plateforme.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Les positions sont rattachées au <strong>véhicule</strong> et à la campagne, non à l'identité personnelle du chauffeur.</li>
          <li>L'annonceur n'accède aux positions que pendant la fenêtre de la campagne approuvée, via des règles d'accès appliquées au niveau de la base de données.</li>
          <li>Les positions brutes sont conservées 13 mois maximum, puis supprimées ; seules les métriques agrégées de campagne sont conservées pour la facturation.</li>
          <li>Le chauffeur peut arrêter le suivi à tout moment ; aucune collecte n'a lieu hors campagne.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Durée de conservation">
        <ul className="list-disc pl-6 space-y-2">
          <li>Données client actif : pendant toute la durée de la relation contractuelle.</li>
          <li>Positions GPS brutes : 13 mois maximum. Métriques agrégées : durée de conservation comptable.</li>
          <li>Photographies de véhicule et de pose : durée de la campagne + 3 ans (preuve d'exécution).</li>
          <li>Données comptables et de paiement : 10 ans (obligation légale).</li>
          <li>Données prospects : 3 ans à compter du dernier contact.</li>
          <li>Logs techniques : 12 mois maximum.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Destinataires et sous-traitants">
        <p>
          Vos données sont destinées à MoveSpot (administration, modération, comptabilité) et à ses sous-traitants
          techniques, chacun agissant sur instructions et dans le cadre d'engagements conformes au RGPD :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Hébergement, base de données, authentification et stockage de fichiers</strong> — infrastructure cloud de la Plateforme (Union européenne).</li>
          <li><strong>Stripe</strong> — paiements par carte, abonnements, comptes de paiement partenaires et reversements.</li>
          <li><strong>Établissement bancaire</strong> — traitement des virements entrants B2B et des virements SEPA sortants.</li>
          <li><strong>Mapbox</strong> — affichage cartographique et fonds de carte.</li>
          <li><strong>API publiques françaises</strong> (Annuaire des Entreprises / INSEE Sirene) — vérification des identités d'entreprise.</li>
          <li><strong>Service d'envoi d'emails transactionnels</strong> — notifications de compte et de campagne.</li>
          <li><strong>Fournisseur de modèles d'IA</strong> — assistance conversationnelle et analyse automatisée de photos de véhicules ; aucune donnée n'est utilisée pour entraîner des modèles.</li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Décisions automatisées">
        <p>
          Certaines vérifications sont assistées par des traitements automatisés : analyse des photographies de
          véhicules (cohérence avec la déclaration, détection d'images générées) et contrôle de mots-clés interdits sur
          les créations. Ces traitements n'aboutissent jamais seuls à un refus définitif : toute décision de refus est
          revue par un opérateur humain de MoveSpot, et vous pouvez la contester à l'adresse de contact ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title="9. Accès par des agents et outils tiers">
        <p>
          La Plateforme propose des intégrations permettant à des applications ou agents tiers de consulter, en
          lecture seule, vos propres données (flotte, briefs, campagnes, solde). Cet accès n'est possible qu'après
          votre autorisation explicite et peut être révoqué à tout moment depuis votre espace.
        </p>
      </LegalSection>

      <LegalSection title="10. Transferts hors UE">
        <p>
          Certains de nos prestataires peuvent traiter des données en dehors de l'Union européenne. Dans ce cas, nous
          nous assurons que des garanties appropriées sont mises en place (clauses contractuelles types de la
          Commission européenne ou décision d'adéquation).
        </p>
      </LegalSection>

      <LegalSection title="11. Vos droits">
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

      <LegalSection title="12. Sécurité">
        <p>
          MoveSpot met en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des échanges
          (HTTPS/TLS), cloisonnement des accès par règles de sécurité au niveau de la base de données, séparation des
          rôles utilisateurs, authentification à deux facteurs (TOTP) disponible pour tous les comptes, stockage des
          fichiers sensibles dans des espaces privés accessibles uniquement via des liens temporaires signés,
          signature cryptographique des QR codes véhicules, sauvegardes régulières et audits de sécurité.
        </p>
      </LegalSection>

      <LegalSection title="13. Modifications">
        <p>
          La présente politique peut être mise à jour à tout moment. Toute modification substantielle vous sera
          notifiée par email ou via la Plateforme.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
