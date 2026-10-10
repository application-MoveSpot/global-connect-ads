import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — MoveSpot" },
      { name: "description", content: "Politique de confidentialité MoveSpot : données de géolocalisation, paiements, droits RGPD (UE) et droits CCPA/FDBR pour les résidents américains." },
      { property: "og:title", content: "Politique de confidentialité — MoveSpot" },
      { property: "og:description", content: "Comment MoveSpot collecte, utilise et protège vos données, y compris les positions GPS de campagne." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/confidentialite" }, ...hreflangLinks("/confidentialite")],
  }),
  component: Privacy,
});

function Privacy() {
  const { t } = useTranslation();
  return (
    <LegalPage eyebrow={t("confidentialite.eyebrow")} title={t("confidentialite.title")} updatedAt="6 octobre 2026">
      <LegalSection title={t("confidentialite.s1")}>
        <p>
          MoveSpot accorde une importance particulière à la protection des données personnelles. La présente politique
          décrit la manière dont vos données sont collectées, utilisées et protégées, conformément au Règlement
          Général sur la Protection des Données (UE 2016/679, « RGPD ») et à la loi Informatique et Libertés modifiée.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s2")}>
        <p>
          Le responsable du traitement est RAKOUN KLUB, entreprise individuelle exploitant MoveSpot (voir les{" "}
          <a href="/mentions-legales" className="text-primary hover:underline">mentions légales</a>).
          Pour toute question relative à vos données, contactez-nous à
          <a href="mailto:privacy@movespot.fr" className="text-primary hover:underline"> privacy@movespot.fr</a>.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s3")}>
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Données d'identification</strong> : nom, prénom, dénomination ou nom du chef d'entreprise, fonction, SIREN/SIRET.</li>
          <li><strong>Données de contact</strong> : adresse email, téléphone, adresse de correspondance.</li>
          <li><strong>Données de compte et de sécurité</strong> : identifiants, journaux de connexion, secret d'authentification à deux facteurs (TOTP) et facteurs enregistrés.</li>
          <li><strong>Données de campagne</strong> : brief, zone de diffusion dessinée, étapes d'itinéraire saisies (adresses ou lieux, transmises au service de cartographie pour géocodage et calcul de trajet), créations publicitaires, vidéos, dates.</li>
          <li><strong>Données de véhicule et de pose</strong> : caractéristiques, photographies du véhicule et photographies de contrôle de pose (avant, côtés, arrière).</li>
          <li><strong>Données de géolocalisation</strong> : positions GPS horodatées transmises pendant les périodes de conduite déclarées, et métriques agrégées (distance, minutes actives, taux de couverture de zone).</li>
          <li><strong>Données de paiement</strong> : historique de transactions, solde de portefeuille, statut du compte de paiement et références de virement. Les numéros de carte ne sont jamais traités ni stockés par MoveSpot.</li>
          <li><strong>Données de connexion technique</strong> : adresse IP, type de navigateur, pages visitées, horodatage.</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s4")}>
        <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
          <thead className="bg-secondary/50">
            <tr>
              <th className="text-left p-3 font-medium">{t("confidentialite.col_purpose")}</th>
              <th className="text-left p-3 font-medium">{t("confidentialite.col_legal_basis")}</th>
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

      <LegalSection title={t("confidentialite.s5")}>
        <p>
          Les positions GPS sont collectées uniquement lorsque le driver active le suivi, et uniquement pendant les
          périodes de conduite déclarées d'une campagne. Elles sont mises en mémoire tampon sur le terminal puis
          envoyées par lots à la Plateforme.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Les positions sont rattachées au <strong>véhicule</strong> et à la campagne, non à l'identité personnelle du driver.</li>
          <li>L'advertiser n'accède aux positions que pendant la fenêtre de la campagne approuvée, via des règles d'accès appliquées au niveau de la base de données.</li>
          <li>Les positions brutes sont conservées 13 mois maximum, puis supprimées ; seules les métriques agrégées de campagne sont conservées pour la facturation.</li>
          <li>Le driver peut arrêter le suivi à tout moment ; aucune collecte n'a lieu hors campagne.</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s6")}>
        <ul className="list-disc pl-6 space-y-2">
          <li>Données client actif : pendant toute la durée de la relation contractuelle.</li>
          <li>Positions GPS brutes : 13 mois maximum. Métriques agrégées : durée de conservation comptable.</li>
          <li>Photographies de véhicule et de pose : durée de la campagne + 3 ans (preuve d'exécution).</li>
          <li>Données comptables et de paiement : 10 ans (obligation légale).</li>
          <li>Données prospects : 3 ans à compter du dernier contact.</li>
          <li>Logs techniques : 12 mois maximum.</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s7")}>
        <p>
          Vos données sont destinées à MoveSpot (administration, modération, comptabilité) et à ses sous-traitants
          techniques, chacun agissant sur instructions et dans le cadre d'engagements conformes au RGPD :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Hébergement, base de données, authentification et stockage de fichiers</strong> — infrastructure cloud de la Plateforme (Union européenne).</li>
          <li><strong>Stripe</strong> — paiements par carte, abonnements, comptes de paiement partners et reversements.</li>
          <li><strong>Établissement bancaire</strong> — traitement des virements entrants B2B et des virements SEPA sortants.</li>
          <li><strong>Mapbox</strong> — affichage cartographique, fonds de carte, géocodage des adresses d'itinéraire, calcul de trajet et détection des points d'intérêt.</li>
          <li><strong>API publiques françaises</strong> (Annuaire des Entreprises / INSEE Sirene) — vérification des identités d'entreprise.</li>
          <li><strong>Service d'envoi d'emails transactionnels</strong> — notifications de compte et de campagne.</li>
          <li><strong>Fournisseur de modèles d'IA</strong> — assistance conversationnelle et analyse automatisée de photos de véhicules ; aucune donnée n'est utilisée pour entraîner des modèles.</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s8")}>
        <p>
          Certaines vérifications sont assistées par des traitements automatisés : analyse des photographies de
          véhicules (cohérence avec la déclaration, détection d'images générées) et contrôle de mots-clés interdits sur
          les créations. Ces traitements n'aboutissent jamais seuls à un refus définitif : toute décision de refus est
          revue par un opérateur humain de MoveSpot, et vous pouvez la contester à l'adresse de contact ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s9")}>
        <p>
          Deux catégories d'emails sont émises depuis le domaine <strong>notify.move-spot.com</strong> :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Emails de service</strong> (base légale : exécution du contrat) — activation de campagne,
            confirmation de virement reçu, décisions de modération, alertes de sécurité. Ils ne comportent aucun
            contenu publicitaire et ne sont pas soumis au consentement.
          </li>
          <li>
            <strong>Emails d'information commerciale</strong> (base légale : consentement) — envoyés uniquement après
            accord, avec un lien de désinscription dans chaque message et une page{" "}
            <a href="/unsubscribe" className="text-primary hover:underline">de désinscription</a> accessible à tout
            moment. Une adresse désinscrite est inscrite dans une liste de suppression qui bloque tout envoi ultérieur.
          </li>
        </ul>
        <p>
          Nos emails n'intègrent pas de pixel de traçage publicitaire. Les journaux d'expédition (statut de remise,
          erreurs) sont conservés 12 mois maximum à des fins de délivrabilité.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s10")}>
        <p>
          La Plateforme propose des intégrations permettant à des applications ou agents tiers de consulter, en
          lecture seule, vos propres données (flotte, briefs, campagnes, solde). Cet accès n'est possible qu'après
          votre autorisation explicite et peut être révoqué à tout moment depuis votre espace.
        </p>
      </LegalSection>


      <LegalSection title={t("confidentialite.s11")}>
        <p>
          Certains de nos providers peuvent traiter des données en dehors de l'Union européenne. Dans ce cas, nous
          nous assurons que des garanties appropriées sont mises en place (clauses contractuelles types de la
          Commission européenne ou décision d'adéquation).
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s12")}>
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
          <a href="mailto:privacy@movespot.fr" className="text-primary hover:underline"> privacy@movespot.fr</a>.
          Une réponse vous sera apportée dans un délai maximum d'un mois.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s13")}>
        <p>
          MoveSpot met en œuvre des mesures techniques et organisationnelles appropriées : chiffrement des échanges
          (HTTPS/TLS), cloisonnement des accès par règles de sécurité au niveau de la base de données, séparation des
          rôles utilisateurs, authentification à deux facteurs (TOTP) disponible pour tous les comptes, stockage des
          fichiers sensibles dans des espaces privés accessibles uniquement via des liens temporaires signés,
          signature cryptographique des QR codes véhicules, sauvegardes régulières et audits de sécurité.
        </p>
        <p>
          Votre session est conservée localement sur votre terminal (stockage du navigateur) et son jeton est
          renouvelé automatiquement : les mises à jour de la Plateforme n'entraînent ni perte de session ni
          transmission supplémentaire de données. La déconnexion supprime ces éléments de votre terminal.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s14")}>
        <p>
          Cette section s'adresse aux résidents de Californie au titre du <em>California Consumer Privacy Act</em> tel
          qu'amendé par le <em>California Privacy Rights Act</em> (CCPA/CPRA, Cal. Civ. Code § 1798.100 et s.), et aux
          résidents de Floride au titre du <em>Florida Digital Bill of Rights</em> (FDBR, § 501.71 F.S.).
        </p>

        <h4 className="font-semibold mt-4 mb-2">Catégories de données collectées</h4>
        <p>MoveSpot collecte les catégories suivantes au sens du CCPA :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Identifiants</strong> : nom, email, identifiant de compte.</li>
          <li><strong>Informations commerciales</strong> : campagnes, transactions, solde de portefeuille.</li>
          <li><strong>Données de géolocalisation</strong> : positions GPS liées au véhicule pendant les campagnes.</li>
          <li><strong>Activité sur Internet / réseau</strong> : pages consultées, journaux de connexion.</li>
          <li><strong>Données professionnelles</strong> : SIREN/SIRET, informations d'entreprise.</li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">MoveSpot ne vend pas vos données</h4>
        <p>
          MoveSpot ne vend ni ne partage vos données personnelles à des tiers à des fins de publicité comportementale
          croisée (<em>cross-context behavioral advertising</em>). Vous pouvez néanmoins nous notifier d'une demande
          d'opt-out à l'adresse ci-dessous, ce qui sera enregistré dans votre dossier.
        </p>

        <h4 className="font-semibold mt-4 mb-2">Vos droits</h4>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Droit de savoir</strong> — connaître les catégories et finalités de traitement vous concernant.</li>
          <li><strong>Droit d'accès</strong> — obtenir une copie des données personnelles collectées au cours des
            12 derniers mois.</li>
          <li><strong>Droit de rectification</strong> — corriger des données inexactes vous concernant.</li>
          <li><strong>Droit à l'effacement</strong> — demander la suppression de vos données personnelles, sous
            réserve d'exceptions légales (obligations comptables, exécution du contrat en cours).</li>
          <li><strong>Droit d'opt-out</strong> — s'opposer à toute vente ou partage de vos données (sans objet ici,
            MoveSpot ne vendant pas de données).</li>
          <li><strong>Droit à la non-discrimination</strong> — l'exercice de ces droits n'entraîne aucune différence
            de tarif, de qualité de service ou d'accès à la Plateforme.</li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">Comment exercer vos droits</h4>
        <p>
          Envoyez un email à{" "}
          <a href="mailto:privacy@movespot.fr" className="text-primary hover:underline">privacy@movespot.fr</a>{" "}
          en indiquant en objet <strong>« California Privacy Rights »</strong> ou <strong>« Florida Privacy Rights »</strong>{" "}
          selon votre État de résidence. Nous répondrons dans un délai de <strong>45 jours</strong> (extensible à 90 jours
          en cas de complexité, avec notification préalable). Vous pouvez également mandater un agent autorisé pour
          soumettre une demande en votre nom.
        </p>
        <p className="mt-2">
          Les résidents de Californie disposent du droit d'introduire une réclamation auprès du{" "}
          <em>California Privacy Protection Agency</em> (
          <a href="https://cppa.ca.gov" className="text-primary hover:underline">cppa.ca.gov</a>).
          Les résidents de Floride peuvent s'adresser au{" "}
          <em>Florida Department of Legal Affairs</em> (
          <a href="https://myfloridalegal.com" className="text-primary hover:underline">myfloridalegal.com</a>).
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s15")}>
        <p>
          La présente politique peut être mise à jour à tout moment. Toute modification substantielle vous sera
          notifiée par email ou via la Plateforme.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
