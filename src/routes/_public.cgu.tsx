import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/_public/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — MoveSpot" },
      {
        name: "description",
        content:
          "CGU MoveSpot : accès au service, charte publicitaire, obligations des drivers, calcul du budget de zone, flux financiers, force majeure et sécurité des comptes.",
      },
      { property: "og:title", content: "Conditions Générales d'Utilisation — MoveSpot" },
      {
        property: "og:description",
        content: "Règles d'accès et d'usage de la marketplace de publicité mobile MoveSpot.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/cgu" }, ...hreflangLinks("/cgu")],
  }),

  component: CGU,
});

function CGU() {
  const { t } = useTranslation();
  return (
    <LegalPage
      eyebrow={t("cgu.eyebrow")}
      title={t("cgu.title")}
      updatedAt="11 novembre 2026"
      showHeader={false}
    >
      <LegalSection title={t("cgu.s1")}>
        <p>
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de
          définir les modalités et conditions dans lesquelles MoveSpot (ci-après « la Plateforme »)
          met à disposition de ses utilisateurs ses services de visualisation de la mobilité
          mondiale en temps réel et de réservation d'emplacements publicitaires.
        </p>
        <p>
          L'accès et l'utilisation de la Plateforme impliquent l'acceptation pleine et entière des
          présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s2")}>
        <p>
          La Plateforme MoveSpot est éditée par <strong>RAKOUN KLUB</strong>, entreprise
          individuelle. Adresse postale de l'entreprise : 1 Lot, Immeuble Sud Jarry, ZAC de
          Houelbourg, 97122 Baie-Mahault (Guadeloupe, France). SIRET : 804 671 444 00052. Contact :{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s3")}>
        <p>
          La Plateforme est accessible gratuitement à tout utilisateur disposant d'un accès à
          Internet. Les coûts liés à l'accès au service (matériel, logiciels, connexion Internet)
          sont à la charge exclusive de l'utilisateur.
        </p>
        <p>
          Les mises à jour courantes de la Plateforme sont conçues pour s'effectuer sans
          interruption de session, conformément aux dispositions de l'article 20 « Continuité de
          service lors des mises à jour ».
        </p>
        <p>
          Indépendamment de ces mises à jour courantes, MoveSpot se réserve le droit de suspendre,
          interrompre ou limiter temporairement l'accès à tout ou partie du service, sans préavis ni
          indemnité, en cas de maintenance exceptionnelle, d'incident technique, de force majeure ou
          pour des motifs de sécurité.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s4")}>
        <p>
          Certaines fonctionnalités nécessitent la création d'un compte. L'utilisateur s'engage à
          fournir des informations exactes, complètes et à jour. Il est responsable de la
          confidentialité de ses identifiants et de toute action effectuée depuis son compte.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s5")}>
        <p>L'utilisateur s'engage à :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>respecter la législation française et internationale en vigueur ;</li>
          <li>ne pas porter atteinte aux droits de tiers ;</li>
          <li>ne pas perturber le fonctionnement de la Plateforme ;</li>
          <li>
            ne soumettre que des campagnes publicitaires conformes à la charte de contenu de
            MoveSpot.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("cgu.s6")}>
        <p>
          Sont strictement refusées toutes campagnes à caractère religieux ou de fêtes religieuses,
          politique ou électoral (partis, candidats, mouvements, propagande, élections), sexistes,
          pornographiques, ou incitant à la violence sous toutes ses formes. Sont également exclus
          les messages d'anniversaires personnels et plus largement tout contenu privé à caractère
          célébratoire individuel. MoveSpot se réserve le droit de refuser toute campagne ne
          respectant pas cette charte, sans avoir à se justifier ni à rembourser les frais déjà
          engagés au titre du contrôle éditorial.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s7")}>
        <p>
          L'ensemble des éléments composant la Plateforme (textes, graphismes, logos, icônes,
          images, données) est la propriété exclusive de MoveSpot ou de ses partners. Toute
          reproduction, représentation ou exploitation, totale ou partielle, est strictement
          interdite sans autorisation préalable et écrite.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s8")}>
        <p>
          MoveSpot s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées,
          sans garantie d'exhaustivité. La Plateforme ne saurait être tenue responsable des dommages
          directs ou indirects résultant de l'utilisation du service ou de l'impossibilité d'y
          accéder.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s9")}>
        <p>
          MoveSpot se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs
          seront informés de toute modification substantielle. La version applicable est celle en
          vigueur à la date d'utilisation.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s10")}>
        <p>
          MoveSpot est un intermédiaire numérique de mise en relation entre annonceurs,
          propriétaires de véhicules, drivers et poseurs certifiés. MoveSpot ne possède aucun
          véhicule, aucun matériel d'affichage et n'exerce aucune activité de transport ni de pose
          de covering.
        </p>
        <p>
          En conséquence, MoveSpot est totalement exonérée de responsabilité concernant l'état
          mécanique, l'entretien, l'assurance ou la conformité réglementaire des véhicules, ainsi
          que concernant les défauts de pose, de décollement, de bullage ou de dégradation du vinyle
          publicitaire. Ces responsabilités relèvent exclusivement des propriétaires de véhicules et
          des poseurs certifiés, qui agissent en tant que professionnels indépendants.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s11")}>
        <p>Le driver participant à une campagne s'engage à :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            activer et maintenir actif le module de géolocalisation en arrière-plan pendant
            l'ensemble de ses heures de conduite déclarées ; toute période non couverte par des
            relevés GPS n'est pas comptabilisée et ne donne lieu à aucune rémunération ;
          </li>
          <li>
            ne pas altérer, falsifier ou simuler les données de géolocalisation transmises à la
            Plateforme ;
          </li>
          <li>
            respecter le code de la route et l'ensemble de la réglementation applicable à son
            activité ;
          </li>
          <li>
            maintenir le visuel publicitaire propre, visible et intact pendant toute la durée de la
            campagne ;
          </li>
          <li>
            signaler sans délai tout sinistre, retrait ou dégradation du support publicitaire.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("cgu.s11bis")}>
        <p>
          Le propriétaire du véhicule s'engage à présenter son véhicule dans un état compatible avec
          la pose d'un support publicitaire vinyle le jour de l'intervention planifiée. À ce titre,
          il s'engage expressément à :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            présenter son véhicule <strong>parfaitement lavé à l'extérieur</strong> le jour de la
            pose (carrosserie, bas de caisse, pavillon) ;
          </li>
          <li>
            signaler <strong>avant la planification de la pose</strong> tout défaut de carrosserie
            connu susceptible d'empêcher l'adhésion du vinyle (rouille, bosses profondes, peinture
            écaillée, réparations en cours) ;
          </li>
          <li>
            être présent au lieu et à l'heure convenus avec le poseur certifié, ou désigner un
            représentant habilité à remettre le véhicule ;
          </li>
          <li>
            maintenir le véhicule en état de marche et disponible pendant toute la durée de la
            campagne, sauf force majeure dûment déclarée.
          </li>
        </ul>

        <p>
          <strong>Frais de traitement en cas de non-présentation.</strong> Si un poseur certifié MoveSpot déclare
          une pose impossible en sélectionnant comme cause « Véhicule trop sale », « Carrosserie
          endommagée / Surface incompatible » ou « Véhicule absent au rendez-vous », cette
          déclaration entraîne automatiquement le prélèvement de{" "}
          <strong>frais de traitement et de dérangement d'un montant de 30 € TTC</strong> sur le
          portefeuille prépayé du propriétaire ou, à défaut de solde suffisant, sur sa prochaine
          campagne. Ces frais couvrent les coûts administratifs et logistiques supportés par
          MoveSpot et par le poseur certifié.
        </p>

        <p>
          <strong>Non-exécution de campagne.</strong> Le propriétaire est
          automatiquement retiré de la campagne concernée, sans perception d'aucune commission ni
          rémunération pour cette campagne, conformément à l'article 15 bis des présentes CGU.
        </p>

        <p>
          <strong>Procédure de contestation.</strong> Le propriétaire dispose d'un délai de{" "}
          <strong>72 heures</strong> à compter de la notification par email pour contester la
          déclaration d'impossibilité en adressant ses éléments de preuve à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
          . MoveSpot examine la contestation dans les 5 jours ouvrés et notifie sa décision. En
          l'absence de contestation dans ce délai, les frais de traitement sont définitivement acquis.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s12")}>
        <p>
          Les paiements des annonceurs sont encaissés via Stripe (ou par virement bancaire pour les
          budgets B2B) et conservés en séquestre par l'intermédiaire de Stripe Connect jusqu'à
          l'exécution de la campagne. MoveSpot prélève une commission d'intermédiation de 30 % du
          montant hors taxes. Sur les 70 % restants, MoveSpot verse directement{" "}
          <strong>au propriétaire du véhicule</strong> sa part de diffusion, et directement{" "}
          <strong>au poseur certifié</strong> ses honoraires de pose et de dépose, chacun via leur
          compte Stripe Connect respectif. Ces honoraires de pose et de dépose sont fixés par
          MoveSpot au moment de la planification de la mission (montant communiqué au poseur avant
          acceptation) et prélevés sur le budget de campagne avant reversement au propriétaire. Le
          chauffeur, en tant qu'indépendant lié au propriétaire du véhicule, est rémunéré par ce
          dernier selon l'accord bilatéral qu'ils ont conclu entre eux ; MoveSpot n'est pas partie
          à cet accord.
        </p>
        <p>
          Les gains sont cumulés sur le compte du propriétaire et deviennent exigibles après
          validation des métriques de campagne (distance parcourue dans la zone de ciblage, minutes
          actives et taux de couverture). Le reversement est conditionné à la finalisation de
          l'inscription Stripe Connect du propriétaire (identité vérifiée et IBAN valide). En cas
          d'anomalie de suivi, de fraude présumée ou de non-respect des obligations ci-dessus,
          MoveSpot peut suspendre le reversement le temps de l'instruction du dossier.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s12bis")}>
        <p>
          MoveSpot peut nouer des partenariats commerciaux avec des apporteurs d'affaires
          indépendants (ci-après « commerciaux ») qui lui présentent des annonceurs potentiels via
          un lien de parrainage personnel. Cette relation est régie par un accord distinct conclu
          entre MoveSpot et chaque commercial ; les présentes CGU ne s'y substituent pas.
        </p>
        <p>
          Le commercial agit en qualité de professionnel indépendant. Il fixe librement son emploi
          du temps, ses méthodes de prospection et les moyens mis en œuvre. Il n'existe aucun lien
          de subordination entre MoveSpot et le commercial : MoveSpot ne lui donne pas
          d'instructions sur la manière d'exercer son activité, ne lui impose ni horaires ni quotas,
          et ne peut pas lui infliger de sanction disciplinaire.
        </p>
        <p>
          La commission due au commercial est calculée en pourcentage du montant hors taxes des
          campagnes conclues par les annonceurs qu'il a parrainés, selon le taux fixé dans son
          accord. Elle est versée par virement bancaire, selon les modalités et délais prévus audit
          accord, et uniquement pour les campagnes effectivement encaissées par MoveSpot. Aucune
          commission n'est due sur les remboursements, annulations ou transactions non exécutées.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s13")}>
        <p>
          L'annonceur définit sa zone de diffusion en dessinant un polygone sur la carte
          interactive. Le budget indicatif est calculé automatiquement à partir de la surface réelle
          de la zone (base de 1,80 € par km² et par jour), majorée d'un coefficient de densité de
          1,5× (soit 2,70 € par km² et par jour) pour les grandes agglomérations. Un montant
          plancher de 25 € par véhicule et par jour s'applique.
        </p>
        <p>
          Ce montant est un devis indicatif calculé par la Plateforme ; il est présenté à
          l'annonceur pour validation avant tout paiement et ne constitue pas une garantie de volume
          d'impressions.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s14")}>
        <p>
          Les relevés de géolocalisation transmis par les drivers sont agrégés (distance parcourue,
          minutes actives, part du trajet effectuée à l'intérieur de la zone de ciblage) et
          restitués à l'annonceur dans son tableau de suivi de campagne. Ces métriques, calculées
          côté serveur, constituent la base contractuelle des reversements.
        </p>
        <p>
          Les positions sont mises en mémoire tampon sur le terminal du driver (y compris en mémoire
          locale persistante) puis envoyées par lots au serveur. Ce mécanisme garantit qu'une
          interruption de réseau temporaire, un rechargement de page lié à une mise à jour de la
          Plateforme ou une reconnexion normale n'entraîne pas de perte de relevés : les données
          horodatées sont conservées localement et transmises automatiquement dès le rétablissement
          de la connexion. La rémunération est donc calculée sur les données effectivement
          enregistrées sur nos serveurs, indépendamment des interruptions de session.
        </p>
        <p>
          En revanche, une absence prolongée et continue de relevés GPS (appareil éteint, GPS
          désactivé, zone non couverte sur une longue durée) rend la période concernée non
          comptabilisable, conformément à l'article 11.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s15")}>
        <p>
          La pose du covering est réalisée exclusivement par un poseur professionnel certifié
          MoveSpot. Ni le driver ni le propriétaire du véhicule ne peuvent procéder eux-mêmes à la
          pose. Après pose, le poseur certifié transmet lui-même, depuis son espace provider de la
          Plateforme, quatre photographies du véhicule (face avant, côté gauche, côté droit, face
          arrière). MoveSpot peut y procéder à titre subsidiaire en cas d'empêchement technique du
          poseur. La campagne passe alors au statut « en attente de validation ». MoveSpot peut
          approuver ou refuser la pose ; en cas de refus motivé, une nouvelle pose conforme par un
          poseur certifié est requise avant tout démarrage de la diffusion et de la rémunération.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s15bis")}>
        <p>
          Si, après validation d'une campagne et paiement par l'annonceur, le poseur certifié
          constate que la pose est techniquement impossible (surface incompatible, état du véhicule
          ou contrainte matérielle indépendante de la volonté des parties), il doit le signaler{" "}
          <strong>dans les 24 heures suivant le constat</strong> via le bouton « Signaler une pose
          impossible » de son espace provider, en joignant obligatoirement{" "}
          <strong>au moins deux photographies horodatées</strong> justifiant l'impossibilité.
        </p>
        <p>
          En cas d'indisponibilité temporaire du bouton dédié, le signalement peut être effectué par
          email à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>{" "}
          dans le même délai de 24 heures, avec les preuves photographiques en pièces jointes. Tout
          signalement effectué hors de ce délai ou sans justificatif photographique ne sera pas
          recevable au titre du présent article.
        </p>
        <p>
          Après réception et vérification du signalement par MoveSpot, celle-ci procédera au{" "}
          <strong>remboursement intégral de l'annonceur</strong> dans un délai de{" "}
          <strong>7 jours ouvrés</strong>, ce délai tenant compte des délais incompressibles imposés
          par le prestataire de paiement Stripe. Aucune commission ne sera due au propriétaire du
          véhicule pour cette campagne.
        </p>
        <p>
          MoveSpot se réserve le droit de proposer à l'annonceur un véhicule alternatif sans frais
          supplémentaires. Si l'annonceur refuse expressément le véhicule alternatif proposé, le
          remboursement intégral lui est acquis dans les conditions ci-dessus. L'absence de réponse
          de l'annonceur dans un délai de 48 heures suivant la proposition vaut acceptation du
          véhicule alternatif.
        </p>
        <p>
          S'agissant du poseur certifié, les frais de déplacement engagés pour se rendre sur le lieu
          de pose sont supportés exclusivement par le poseur en sa qualité de professionnel
          indépendant agissant pour son propre compte. MoveSpot n'étant qu'un intermédiaire de mise
          en relation, elle ne saurait être tenue au remboursement de ces frais, l'incompatibilité
          du véhicule relevant de la relation directe entre le poseur et le propriétaire du
          véhicule. Le poseur certifié reconnaît et accepte expressément cette répartition des
          risques en utilisant la Plateforme.
        </p>
        <p>
          Le présent article 15 bis constitue le régime spécial applicable à l'impossibilité
          technique de pose et prévaut sur les dispositions générales d'annulation et de
          remboursement des Conditions Générales de Vente, notamment sur les règles relatives au
          délai de 72 heures, dès lors que l'impossibilité est dûment signalée et justifiée dans les
          conditions ci-dessus.
        </p>
        <p>
          MoveSpot ne saurait être tenue responsable des conséquences d'une impossibilité technique
          de pose dûment signalée et justifiée dans les conditions prévues au présent article. En
          l'absence de signalement conforme, les règles générales de remboursement des CGV
          s'appliquent.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s16")}>
        <p>
          La Plateforme met à disposition une authentification à deux facteurs (application
          d'authentification / TOTP) activable depuis l'espace « Sécurité ». Son activation est
          fortement recommandée pour tout compte associé à des flux financiers. L'utilisateur
          demeure responsable de la conservation de ses codes et de son secret d'authentification.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s17")}>
        <p>
          MoveSpot expose des intégrations pour agents et outils tiers permettant, après
          autorisation explicite de l'utilisateur, la consultation en lecture de ses propres données
          (flotte, briefs, campagnes, solde de portefeuille). Aucun accès n'est accordé sans
          consentement, et l'utilisateur peut le révoquer à tout moment.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s18")}>
        <p>
          MoveSpot adresse à l'utilisateur des <strong>emails de service</strong> liés à l'exécution
          du contrat : activation d'une campagne, confirmation de réception d'un virement, décision
          de modération d'une création ou d'un véhicule, alertes de sécurité du compte. Ces messages
          sont nécessaires au fonctionnement du service et ne peuvent pas être désactivés tant que
          le compte est actif.
        </p>
        <p>
          Les emails d'information commerciale sont distincts et n'ont lieu qu'avec consentement.
          Chacun comporte un lien de désinscription immédiate, également accessible depuis la page{" "}
          <a href="/unsubscribe" className="text-primary hover:underline">
            de désinscription
          </a>
          . Les emails sont expédiés depuis le domaine <strong>notify.move-spot.com</strong> : tout
          message présenté comme provenant de MoveSpot depuis une autre adresse doit être considéré
          comme suspect.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s19")}>
        <p>
          Lors de la création d'un brief, l'annonceur saisit des étapes (adresses ou lieux). La
          Plateforme les géocode automatiquement, calcule le tracé routier, identifie les quartiers
          traversés et les points d'intérêt situés à proximité du trajet, puis en déduit une
          estimation d'impressions quotidiennes (distance × densité de trafic × coefficients de
          format, de mobilité et de plage horaire).
        </p>
        <p>
          Cette estimation est une <strong>projection statistique indicative</strong> destinée au
          dimensionnement de la campagne. Elle ne constitue ni un engagement de résultat, ni une
          garantie de volume d'impressions ou de passage effectif par les étapes indiquées,
          l'itinéraire réel dépendant de la circulation et de l'activité du driver.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s20")}>
        <p>
          La Plateforme est mise à jour en continu. Ces mises à jour sont conçues pour ne pas
          interrompre la session de l'utilisateur : le rechargement d'une nouvelle version de
          l'application s'effectue de façon transparente et la session connectée est préservée. Une
          reconnexion peut toutefois rester nécessaire en cas d'expiration normale du jeton
          d'authentification ou de déconnexion volontaire.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s21")}>
        <p>
          Certaines situations indépendantes de la volonté du driver ou du propriétaire du véhicule
          peuvent empêcher ou limiter la circulation dans la zone de ciblage déclarée par
          l'annonceur. Sont notamment visés :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            les <strong>travaux de voirie</strong> (chantiers, fermetures de voies, déviations
            imposées par les autorités) ;
          </li>
          <li>
            les <strong>événements publics</strong> (manifestations, cortèges, rassemblements,
            barrages de police) ;
          </li>
          <li>
            les <strong>conditions climatiques exceptionnelles</strong> (tempête, inondation, neige
            rendant la circulation impossible ou dangereuse) ;
          </li>
          <li>
            tout autre <strong>cas de force majeure</strong> au sens du droit français (événement
            imprévisible, irrésistible et extérieur).
          </li>
        </ul>
        <p>
          Dans ces situations, le driver ou le propriétaire peut{" "}
          <strong>signaler un obstacle</strong> directement depuis son espace personnel. La période
          signalée est instruite par MoveSpot ; si l'événement est avéré et documenté (arrêté
          municipal, capture d'écran, référence presse), les métriques de la période concernée
          peuvent être <strong>neutralisées</strong> pour le calcul de la rémunération, à la
          discrétion de MoveSpot.
        </p>
        <p>
          En l'absence de signalement, les périodes non couvertes ou hors zone restent non
          comptabilisées, conformément à l'article 14. MoveSpot ne peut en aucun cas garantir
          l'absence d'obstacles extérieurs sur un itinéraire donné, ni la disponibilité permanente
          de la zone de ciblage choisie par l'annonceur.
        </p>
        <p>
          L'annonceur est informé que la surface de diffusion effective peut être réduite par de
          tels événements, sans que cela n'ouvre droit à remboursement du budget déjà consommé, sauf
          accord exprès de MoveSpot.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s22")}>
        <p>
          Toute relation commerciale entre utilisateurs (annonceur, propriétaire de véhicule,
          driver, poseur) dont la mise en contact a été réalisée via MoveSpot doit être
          intégralement conclue et exécutée au sein de la Plateforme. Il est expressément interdit
          de :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            convenir d'un paiement direct entre utilisateurs en dehors des circuits de paiement
            MoveSpot ;
          </li>
          <li>conclure un contrat privé relatif à une prestation initiée via MoveSpot ;</li>
          <li>
            communiquer des coordonnées personnelles (numéro de téléphone, adresse email, lien vers
            un réseau social ou une messagerie externe) à des fins de contournement de la Plateforme
            dans les champs de message.
          </li>
        </ul>
        <p>
          La Plateforme met en œuvre des moyens techniques de détection automatique de ces
          comportements dans les champs de messagerie (analyse des messages avant envoi et avant
          enregistrement en base de données) et se réserve le droit de bloquer ou supprimer tout
          message contenant de telles coordonnées.
        </p>
        <p>
          Toute violation de la présente obligation expose l'utilisateur fautif à la{" "}
          <strong>suspension immédiate et définitive de son compte MoveSpot</strong>, sans préjudice
          de dommages et intérêts correspondant au minimum à la commission MoveSpot perdue (30 % du
          montant hors taxes de la transaction détournée). La commission reste due et exigible même
          en l'absence de transaction via la Plateforme, dès lors que la mise en relation initiale a
          été effectuée par son intermédiaire.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s23")}>
        <p>
          Les présentes CGU sont régies par le droit français. Tout litige relatif à leur
          interprétation ou exécution relève de la compétence exclusive des tribunaux français.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
