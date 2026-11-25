import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — MoveSpot" },
      {
        name: "description",
        content:
          "Politique de confidentialité MoveSpot : données de géolocalisation, paiements, droits RGPD (UE) et droits CCPA/FDBR pour les résidents américains.",
      },
      { property: "og:title", content: "Politique de confidentialité — MoveSpot" },
      {
        property: "og:description",
        content:
          "Comment MoveSpot collecte, utilise et protège vos données, y compris les positions GPS de campagne.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/confidentialite" },
      ...hreflangLinks("/confidentialite"),
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const { t } = useTranslation();
  return (
    <LegalPage
      eyebrow={t("confidentialite.eyebrow")}
      title={t("confidentialite.title")}
      updatedAt="17 novembre 2026"
    >
      <LegalSection title={t("confidentialite.s1")}>
        <p>
          MoveSpot accorde une importance particulière à la protection des données personnelles. La
          présente politique décrit la manière dont vos données sont collectées, utilisées et
          protégées, conformément au Règlement Général sur la Protection des Données (UE 2016/679, «
          RGPD ») et à la loi Informatique et Libertés modifiée.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s2")}>
        <p>
          Le responsable du traitement est{" "}
          <strong>Garry PALERME, Entrepreneur individuel (EI) — Nom commercial : MoveSpot</strong>{" "}
          (SIRET : 804 671 444 00052), exploitant MoveSpot (voir les{" "}
          <a href="/mentions-legales" className="text-primary hover:underline">
            mentions légales
          </a>
          ). Pour toute question relative à vos données, contactez-nous à
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            {" "}
            contact@move-spot.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s3")}>
        <p>Nous collectons les catégories de données suivantes :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Données d'identification</strong> : nom, prénom, dénomination ou nom du chef
            d'entreprise, fonction, SIREN/SIRET.
          </li>
          <li>
            <strong>Données de contact</strong> : adresse email, numéro de téléphone (collecté
            pour les chauffeurs afin de leur envoyer les confirmations d'installation par SMS),
            adresse de correspondance.
          </li>
          <li>
            <strong>Données de compte et de sécurité</strong> : identifiants, journaux de connexion,
            secret d'authentification à deux facteurs (TOTP) et facteurs enregistrés.
          </li>
          <li>
            <strong>Données de campagne</strong> : brief, zone de diffusion dessinée, étapes
            d'itinéraire saisies (adresses ou lieux, transmises au service de cartographie pour
            géocodage et calcul de trajet), créations publicitaires, vidéos, dates.
          </li>
          <li>
            <strong>Données de véhicule et de pose</strong> : caractéristiques, photographies du
            véhicule et photographies de contrôle de pose (avant, côtés, arrière).
          </li>
          <li>
            <strong>Données de géolocalisation</strong> : positions GPS horodatées transmises
            pendant les périodes de conduite déclarées, et métriques agrégées (distance, minutes
            actives, taux de couverture de zone).
          </li>
          <li>
            <strong>Données de paiement</strong> : historique de transactions, solde de
            portefeuille, statut du compte de paiement et références de virement. Les numéros de
            carte ne sont jamais traités ni stockés par MoveSpot.
          </li>
          <li>
            <strong>Données de connexion technique</strong> : adresse IP, type de navigateur, pages
            visitées, horodatage.
          </li>
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
            <tr>
              <td className="p-3">Gestion des briefs, campagnes et mise en relation</td>
              <td className="p-3">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3">
                Suivi de diffusion par géolocalisation et calcul des métriques
              </td>
              <td className="p-3">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3">Contrôle de la pose du support (photographies)</td>
              <td className="p-3">Exécution du contrat</td>
            </tr>
            <tr>
              <td className="p-3">Modération du contenu publicitaire et des véhicules</td>
              <td className="p-3">Intérêt légitime</td>
            </tr>
            <tr>
              <td className="p-3">Paiements, reversements et lutte contre la fraude</td>
              <td className="p-3">Exécution du contrat / Obligation légale</td>
            </tr>
            <tr>
              <td className="p-3">Authentification à deux facteurs et sécurité des comptes</td>
              <td className="p-3">Intérêt légitime / Obligation de sécurité</td>
            </tr>
            <tr>
              <td className="p-3">Vérification d'identité d'entreprise (SIRET)</td>
              <td className="p-3">Intérêt légitime</td>
            </tr>
            <tr>
              <td className="p-3">Facturation et obligations comptables</td>
              <td className="p-3">Obligation légale</td>
            </tr>
            <tr>
              <td className="p-3">Envoi d'informations commerciales</td>
              <td className="p-3">Consentement</td>
            </tr>
            <tr>
              <td className="p-3">Mesure d'audience et statistiques</td>
              <td className="p-3">Consentement (cookies)</td>
            </tr>
            <tr>
              <td className="p-3">
                Analyse automatisée des messages internes (détection de coordonnées personnelles
                partagées à des fins de contournement de la Plateforme)
              </td>
              <td className="p-3">Intérêt légitime (art. 6.1.f du RGPD)</td>
            </tr>
            <tr>
              <td className="p-3">
                Extraction automatique par IA des informations figurant sur les certificats
                d'immatriculation (OCR — marque, modèle, immatriculation, VIN, énergie). Le document
                est analysé à la volée et n'est jamais stocké sur nos serveurs.
              </td>
              <td className="p-3">Consentement de l'utilisateur (action volontaire)</td>
            </tr>
          </tbody>
        </table>
      </LegalSection>

      <LegalSection title={t("confidentialite.s5")}>
        <p>
          Dans le cadre de l'exécution du contrat de diffusion publicitaire (art. 6.1.b du RGPD),
          les véhicules partenaires transmettent leur position GPS toutes les trente (30) secondes
          pendant les périodes d'activation de campagne. Ces données sont mises en mémoire tampon
          sur le terminal puis envoyées par lots à la Plateforme.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Les positions sont rattachées à un <strong>identifiant technique de véhicule et de
            session de campagne</strong>, non à l'identité civile du conducteur. Elles ne font
            l'objet d'aucun profilage comportemental du conducteur.
          </li>
          <li>
            L'annonceur n'accède aux positions que pendant la fenêtre de la campagne approuvée, via
            des règles d'accès appliquées au niveau de la base de données.
          </li>
          <li>
            Les positions brutes sont conservées <strong>13 mois maximum</strong>, puis anonymisées
            à des fins statistiques ; seules les métriques agrégées de campagne sont conservées pour
            la facturation.
          </li>
          <li>
            Le suivi GPS constitue une condition technique indispensable au calcul de la
            rémunération et à la preuve de diffusion ; sa désactivation entraîne la suspension
            automatique du décompte des revenus sur la période concernée (CGU, art. 11).
          </li>
          <li>
            <strong>Hors campagne active et validée</strong>, aucune donnée de géolocalisation GPS
            n'est collectée ni transmise à la Plateforme. L'application ne conserve aucune position
            après la clôture d'une session de conduite et ne procède à aucun suivi de localisation
            en arrière-plan.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s6")}>
        <ul className="list-disc pl-6 space-y-2">
          <li>Données client actif : pendant toute la durée de la relation contractuelle.</li>
          <li>
            Positions GPS brutes : 13 mois maximum. Métriques agrégées : durée de conservation
            comptable.
          </li>
          <li>
            Photographies de véhicule et de pose : durée de la campagne + 3 ans (preuve
            d'exécution).
          </li>
          <li>Données comptables et de paiement : 10 ans (obligation légale).</li>
          <li>Données prospects : 3 ans à compter du dernier contact.</li>
          <li>Logs techniques : 12 mois maximum.</li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s7")}>
        <p>
          Vos données sont destinées à MoveSpot (administration, modération, comptabilité) et à ses
          sous-traitants techniques, chacun agissant sur instructions et dans le cadre d'engagements
          conformes au RGPD :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Supabase Inc.</strong> (970 Toa Payoh North #07-04, Singapore 318992 —
            données stockées en UE, région AWS eu-west-3 Paris) — hébergement de la base de
            données, authentification des comptes (dont 2FA TOTP) et stockage des fichiers
            (photos de véhicules, créations publicitaires).
          </li>
          <li>
            <strong>Stripe Payments Europe, Ltd.</strong> (The One Building, 1 Grand Canal Street
            Lower, Dublin 2, Irlande) — paiements par carte, abonnements, comptes de paiement
            Stripe Connect des propriétaires et reversements.
          </li>
          <li>
            <strong>Établissement bancaire partenaire</strong> — traitement des virements entrants
            B2B et des virements SEPA sortants.
          </li>
          <li>
            <strong>Resend Inc.</strong> (2261 Market Street, Suite 5039, San Francisco, CA 94114,
            États-Unis) — envoi des emails transactionnels (notifications d'activation, de
            virement, de modération, alertes de sécurité) depuis le domaine{" "}
            <strong>notify.move-spot.com</strong>.
          </li>
          <li>
            <strong>Brevo (Sendinblue SAS)</strong> (7 rue de Madrid, 75008 Paris, France) —
            envoi de SMS transactionnels aux chauffeurs pour les confirmations d'installation
            publicitaire. Données transmises : numéro de téléphone du chauffeur et message de
            notification horodaté.
          </li>
          <li>
            <strong>Mapbox, Inc.</strong> (740 15th Street NW, Washington, DC 20005,
            États-Unis) — affichage cartographique, géocodage des adresses d'itinéraire, calcul
            de trajet et dessin des zones de diffusion.
          </li>
          <li>
            <strong>API publiques françaises</strong> (Annuaire des Entreprises / INSEE Sirene) —
            vérification des identités d'entreprise (SIRET).
          </li>
          <li>
            <strong>Fournisseur de modèles d'IA</strong> (Anthropic) — assistance
            conversationnelle (FAQ), analyse automatisée de photos de véhicules et extraction OCR
            des informations figurant sur les certificats d'immatriculation (carte grise). Les
            documents sont transmis à la volée pour traitement immédiat et ne sont jamais conservés
            ni utilisés pour entraîner des modèles tiers.
          </li>
          <li>
            <strong>Sentry, Inc.</strong> (45 Fremont Street, 8th Floor, San Francisco, CA 94105,
            États-Unis) — surveillance des erreurs techniques et de la stabilité de l'application
            (stack traces, URL, identifiant technique de session). La transmission est limitée aux
            données strictement nécessaires au débogage ; aucun email ou donnée d'identité civile
            n'est communiqué à Sentry (<code>sendDefaultPii: false</code>).
          </li>
          <li>
            <strong>Meta Platforms Ireland Ltd.</strong> (Merrion Road, Dublin 4, Irlande) — Pixel
            Meta : mesure de conversion publicitaire. Ce traceur n'est activé qu'après votre
            consentement explicite.
          </li>
          <li>
            <strong>Google Ireland Ltd. / Google LLC</strong> (Gordon House, Barrow Street, Dublin 4,
            Irlande — siège mondial : 1600 Amphitheatre Parkway, Mountain View, CA 94043,
            États-Unis) — Google Ads Conversion Tag : mesure de conversion publicitaire. Ce traceur
            n'est activé qu'après votre consentement explicite.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s8")}>
        <p>
          Certaines vérifications sont assistées par des traitements automatisés : analyse des
          photographies de véhicules (cohérence avec la déclaration, détection d'images générées) et
          contrôle de mots-clés interdits sur les créations. Ces traitements n'aboutissent jamais
          seuls à un refus définitif : toute décision de refus est revue par un opérateur humain de
          MoveSpot, et vous pouvez la contester à l'adresse de contact ci-dessous.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s9")}>
        <p>
          Deux catégories d'emails sont émises depuis le domaine{" "}
          <strong>notify.move-spot.com</strong> :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Emails de service</strong> (base légale : exécution du contrat) — activation de
            campagne, confirmation de virement reçu, décisions de modération, alertes de sécurité.
            Ils ne comportent aucun contenu publicitaire et ne sont pas soumis au consentement.
          </li>
          <li>
            <strong>Emails d'information commerciale</strong> (base légale : consentement) — envoyés
            uniquement après accord, avec un lien de désinscription dans chaque message et une page{" "}
            <a href="/unsubscribe" className="text-primary hover:underline">
              de désinscription
            </a>{" "}
            accessible à tout moment. Une adresse désinscrite est inscrite dans une liste de
            suppression qui bloque tout envoi ultérieur.
          </li>
        </ul>
        <p>
          Nos emails n'intègrent pas de pixel de traçage publicitaire. Les journaux d'expédition
          (statut de remise, erreurs) sont conservés 12 mois maximum à des fins de délivrabilité.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s10")}>
        <p>
          La Plateforme propose des intégrations permettant à des applications ou agents tiers de
          consulter, en lecture seule, vos propres données (flotte, briefs, campagnes, solde). Cet
          accès n'est possible qu'après votre autorisation explicite et peut être révoqué à tout
          moment depuis votre espace.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s11")}>
        <p>
          Les bases de données principales de MoveSpot sont hébergées en France (AWS eu-west-3,
          Paris). Certains sous-traitants techniques sont situés aux États-Unis et encadrés par des
          garanties conformes à l'article 46 du RGPD :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Mapbox Inc.</strong> (Washington DC, États-Unis) — cartographie interactive :
            encadré par le <em>Data Privacy Framework UE–États-Unis</em> et des Clauses
            Contractuelles Types (SCC) de la Commission européenne.
          </li>
          <li>
            <strong>Resend Inc.</strong> (San Francisco, États-Unis) — envoi d'e-mails
            transactionnels : encadré par les Clauses Contractuelles Types (SCC, version 2021) de la
            Commission européenne.
          </li>
          <li>
            <strong>Anthropic PBC</strong> (San Francisco, États-Unis) — assistance FAQ, analyse
            automatisée de photos de véhicules et extraction OCR des certificats
            d'immatriculation : encadré par les Clauses Contractuelles Types (SCC) et un accord de
            traitement des données (DPA) garantissant que les documents transmis sont analysés
            uniquement à la volée, ne sont jamais stockés par Anthropic et ne sont en aucun cas
            utilisés pour l'entraînement de modèles d'intelligence artificielle.
          </li>
          <li>
            <strong>Sentry, Inc.</strong> (San Francisco, États-Unis) — surveillance des erreurs
            techniques : encadré par les Clauses Contractuelles Types (SCC) de la Commission
            européenne. Seules des données techniques de débogage (sans PII par défaut) sont
            transmises.
          </li>
          <li>
            <strong>Meta Platforms Ireland Ltd.</strong> (Irlande / UE) — Pixel Meta (mesure de
            conversion, activé uniquement après consentement) : encadré par le{" "}
            <em>Data Privacy Framework UE–États-Unis</em> et les SCC.
          </li>
          <li>
            <strong>Google Ireland Ltd. / Google LLC</strong> (Irlande / États-Unis) — Google Ads
            Conversion Tag (activé uniquement après consentement) : encadré par le{" "}
            <em>Data Privacy Framework UE–États-Unis</em> et les SCC.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("confidentialite.s12")}>
        <p>Conformément au RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Droit d'accès, de rectification et d'effacement de vos données ;</li>
          <li>Droit à la limitation et à l'opposition au traitement ;</li>
          <li>Droit à la portabilité de vos données ;</li>
          <li>Droit de retirer votre consentement à tout moment ;</li>
          <li>Droit de définir des directives post mortem ;</li>
          <li>
            Droit d'introduire une réclamation auprès de la CNIL (
            <a href="https://www.cnil.fr" className="text-primary hover:underline">
              www.cnil.fr
            </a>
            ).
          </li>
        </ul>
        <p>
          Pour exercer vos droits, écrivez-nous à
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            {" "}
            contact@move-spot.com
          </a>
          . Une réponse vous sera apportée dans un délai maximum d'un mois.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s13")}>
        <p>
          MoveSpot met en œuvre des mesures techniques et organisationnelles appropriées :
          chiffrement des échanges (HTTPS/TLS), cloisonnement des accès par règles de sécurité au
          niveau de la base de données, séparation des rôles utilisateurs, authentification à deux
          facteurs (TOTP) disponible pour tous les comptes, stockage des fichiers sensibles dans des
          espaces privés accessibles uniquement via des liens temporaires signés, signature
          cryptographique des QR codes véhicules, sauvegardes régulières et audits de sécurité.
        </p>
        <p>
          Votre session est conservée localement sur votre terminal (stockage du navigateur) et son
          jeton est renouvelé automatiquement : les mises à jour de la Plateforme n'entraînent ni
          perte de session ni transmission supplémentaire de données. La déconnexion supprime ces
          éléments de votre terminal.
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s14")}>
        <p>
          Cette section s'adresse aux résidents de Californie au titre du{" "}
          <em>California Consumer Privacy Act</em> tel qu'amendé par le{" "}
          <em>California Privacy Rights Act</em> (CCPA/CPRA, Cal. Civ. Code § 1798.100 et s.), et
          aux résidents de Floride au titre du <em>Florida Digital Bill of Rights</em> (FDBR, §
          501.71 F.S.).
        </p>

        <h4 className="font-semibold mt-4 mb-2">Catégories de données collectées</h4>
        <p>MoveSpot collecte les catégories suivantes au sens du CCPA :</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Identifiants</strong> : nom, email, identifiant de compte.
          </li>
          <li>
            <strong>Informations commerciales</strong> : campagnes, transactions, solde de
            portefeuille.
          </li>
          <li>
            <strong>Données de géolocalisation</strong> : positions GPS liées au véhicule pendant
            les campagnes.
          </li>
          <li>
            <strong>Activité sur Internet / réseau</strong> : pages consultées, journaux de
            connexion.
          </li>
          <li>
            <strong>Données professionnelles</strong> : SIREN/SIRET, informations d'entreprise.
          </li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">MoveSpot ne vend pas vos données</h4>
        <p>
          MoveSpot ne vend ni ne partage vos données personnelles à des tiers à des fins de
          publicité comportementale croisée (<em>cross-context behavioral advertising</em>). Vous
          pouvez néanmoins nous notifier d'une demande d'opt-out à l'adresse ci-dessous, ce qui sera
          enregistré dans votre dossier.
        </p>

        <h4 className="font-semibold mt-4 mb-2">Vos droits</h4>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Droit de savoir</strong> — connaître les catégories et finalités de traitement
            vous concernant.
          </li>
          <li>
            <strong>Droit d'accès</strong> — obtenir une copie des données personnelles collectées
            au cours des 12 derniers mois.
          </li>
          <li>
            <strong>Droit de rectification</strong> — corriger des données inexactes vous
            concernant.
          </li>
          <li>
            <strong>Droit à l'effacement</strong> — demander la suppression de vos données
            personnelles, sous réserve d'exceptions légales (obligations comptables, exécution du
            contrat en cours).
          </li>
          <li>
            <strong>Droit d'opt-out</strong> — s'opposer à toute vente ou partage de vos données
            (sans objet ici, MoveSpot ne vendant pas de données).
          </li>
          <li>
            <strong>Droit à la non-discrimination</strong> — l'exercice de ces droits n'entraîne
            aucune différence de tarif, de qualité de service ou d'accès à la Plateforme.
          </li>
        </ul>

        <h4 className="font-semibold mt-4 mb-2">Comment exercer vos droits</h4>
        <p>
          Envoyez un email à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>{" "}
          en indiquant en objet <strong>« California Privacy Rights »</strong> ou{" "}
          <strong>« Florida Privacy Rights »</strong> selon votre État de résidence. Nous répondrons
          dans un délai de <strong>45 jours</strong> (extensible à 90 jours en cas de complexité,
          avec notification préalable). Vous pouvez également mandater un agent autorisé pour
          soumettre une demande en votre nom.
        </p>
        <p className="mt-2">
          Les résidents de Californie disposent du droit d'introduire une réclamation auprès du{" "}
          <em>California Privacy Protection Agency</em> (
          <a href="https://cppa.ca.gov" className="text-primary hover:underline">
            cppa.ca.gov
          </a>
          ). Les résidents de Floride peuvent s'adresser au{" "}
          <em>Florida Department of Legal Affairs</em> (
          <a href="https://myfloridalegal.com" className="text-primary hover:underline">
            myfloridalegal.com
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title={t("confidentialite.s15")}>
        <p>
          La présente politique peut être mise à jour à tout moment. Toute modification
          substantielle vous sera notifiée par email ou via la Plateforme.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
