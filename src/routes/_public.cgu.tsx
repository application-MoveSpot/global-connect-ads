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
          "CGU MoveSpot : accès au service, charte publicitaire, obligations des chauffeurs, calcul du budget de zone, flux financiers, force majeure et sécurité des comptes.",
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
      updatedAt="21 novembre 2026"
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
          La Plateforme MoveSpot est éditée par{" "}
          <strong>Garry PALERME, Entrepreneur individuel (EI) — Nom commercial : MoveSpot</strong>.
          Adresse postale : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
          (Guadeloupe, France). SIREN : 804 671 444. Contact :{" "}
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
        <p className="mt-2">
          <strong>Associations loi 1901.</strong> Toute personne physique procédant à l'inscription
          d'une <strong>association déclarée en vertu de la loi du 1er juillet 1901</strong>{" "}
          garantit disposer du <strong>pouvoir statutaire</strong> nécessaire pour l'engager
          juridiquement (qualité de président·e, trésorier·ère, ou mandataire désigné·e par
          délibération du bureau ou de l'assemblée générale). Elle renseigne lors de l'inscription
          le <strong>numéro RNA</strong> (Répertoire National des Associations, format{" "}
          <code>W + 9 chiffres</code>) et, le cas échéant, le <strong>numéro SIREN</strong>{" "}
          attribué par l'INSEE. Elle s'engage également à déclarer l'usage publicitaire de tout
          véhicule associatif à l'<strong>assureur de ce véhicule</strong> préalablement à la
          pose du covering, l'absence de déclaration pouvant entraîner la déchéance de garantie.
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
          images, données) est la propriété exclusive de MoveSpot ou de ses partenaires. Toute
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
          propriétaires de véhicules, chauffeurs et poseurs certifiés. MoveSpot ne possède aucun
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
        <p>Le chauffeur participant à une campagne s'engage à :</p>
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
          <strong>Fourniture du support publicitaire.</strong> Le support publicitaire (vinyle
          adhésif, covering, sticker) est exclusivement imprimé et fourni par le prestataire
          certifié MoveSpot, à partir du fichier de création validé par MoveSpot. Le propriétaire
          du véhicule n'assure en aucun cas l'impression, la fourniture ni le transport du support
          publicitaire. Il n'est pas tenu de se procurer, de commander ni de réceptionner de
          matériau publicitaire physique dans le cadre d'une campagne MoveSpot.
        </p>
        <p>
          <strong>Prise en charge intégrale des frais de pose et de dépose.</strong> Dans le cadre
          d'une campagne MoveSpot, le Propriétaire bénéficie d'une prise en charge intégrale (
          <strong>0 € d'avance de frais</strong>) pour l'impression haute définition du support, la
          pose initiale et la dépose en fin de campagne, lorsqu'il se rend sur rendez-vous dans un
          atelier de pose agréé MoveSpot, ou lorsqu'il reçoit directement un kit magnétique ou
          micro-ventousé prêt à poser.
        </p>
        <p>
          <strong>Supplément forfaitaire de déplacement.</strong> Si le Propriétaire demande une
          intervention à domicile ou sur son lieu de travail (déplacement du poseur hors atelier,
          dans un rayon maximal de 25 km), un supplément forfaitaire de déplacement de{" "}
          <strong>35 € TTC</strong> s'applique, à sa charge (ou déduit de sa cagnotte disponible).
          Au-delà de 25 km, l'intervention fait l'objet d'un devis préalable. Ce supplément
          s'ajoute, le cas échéant, au barème forfaitaire de remise en état prévu à l'article 25
          (49 € / 69 € / 89 € TTC selon le format) lorsque la réintervention est motivée par un
          incident imputable au Propriétaire.
        </p>
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

        <p className="mt-3">
          <strong>Absence du propriétaire ou du conducteur au rendez-vous de pose (no-show
          conducteur).</strong> Tout empêchement au rendez-vous de pose doit être signalé à
          MoveSpot{" "}
          <strong>au moins vingt-quatre (24) heures avant l'heure prévue</strong>, par email à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>{" "}
          ou via la messagerie de l'espace propriétaire sur la Plateforme. À défaut de signalement
          préalable dans ce délai, MoveSpot peut : (i){" "}
          <strong>réaffecter immédiatement la campagne à un autre véhicule</strong> disponible sans
          accord préalable du propriétaire défaillant ; (ii) imputer au propriétaire défaillant les{" "}
          <strong>frais de déplacement à vide</strong> du poseur certifié, forfaitairement fixés à
          un montant pouvant aller jusqu'à <strong>50 € TTC</strong>, prélevés sur son portefeuille
          prépayé ou déduits de sa prochaine rémunération de campagne.
        </p>
        <p className="mt-2">
          <em>Pour les Conducteurs Particuliers agissant en qualité de consommateurs</em>, ces
          frais de déplacement à vide correspondent à un{" "}
          <strong>préjudice matériel réel et justifié</strong> subi par le poseur certifié déplacé
          inutilement ; ils ne constituent pas une pénalité forfaitaire mais le remboursement d'un
          coût effectif. — <strong>Réciprocité :</strong> si MoveSpot annule ou reporte le
          rendez-vous de pose sans faute du conducteur et sans délai de préavis de 24 heures,
          MoveSpot versera au conducteur concerné une <strong>indemnité compensatrice équivalente</strong>{" "}
          (jusqu'à 50 € TTC) sur son portefeuille Plateforme, dans les 5 jours ouvrés.
        </p>

        <p className="mt-3">
          <strong>Retrait anticipé du support publicitaire.</strong> Tout retrait du covering
          (vinyle adhésif, sticker, support magnétique) avant le terme contractuel de la campagne,
          sans motif légitime reconnu par MoveSpot — accident de la circulation dûment déclaré et
          justifié par un constat ou un procès-verbal, cession du véhicule justifiée par acte de
          cession, ou cas de force majeure au sens des présentes CGU — entraîne : (i) la{" "}
          <strong>perte intégrale de la rémunération non encore versée</strong> au titre de la
          campagne concernée ; (ii) la{" "}
          <strong>
            responsabilité du propriétaire pour les frais d'impression et de pose du support
          </strong>{" "}
          selon le barème forfaitaire applicable (49 € / 69 € / 89 € TTC selon le format), ces
          sommes étant déductibles des versements en attente ou facturées directement au propriétaire.
        </p>
        <p className="mt-2">
          <em>Pour les Conducteurs Particuliers consommateurs</em>, les sommes retenues au titre
          d'un retrait anticipé injustifié correspondent aux{" "}
          <strong>frais de réimpression et de repose effectivement engagés</strong> par MoveSpot et
          documentés sur demande. Ces sommes ne peuvent en aucun cas dépasser le préjudice matériel
          réellement subi.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s12")}>
        <p>
          Les paiements des annonceurs sont encaissés via Stripe (ou par virement bancaire pour les
          budgets B2B) et conservés en séquestre par l'intermédiaire de Stripe Connect jusqu'à
          l'exécution de la campagne. MoveSpot prèlève une commission d'intermédiation de 30 % du
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
          campagnes conclues par les annonceurs qu'il a parrrainés, selon le taux fixé dans son
          accord. Elle est versée par virement bancaire, selon les modalités et délais prévus audit
          accord, et uniquement pour les campagnes effectivement encaissées par MoveSpot. Aucune
          commission n'est due sur les remboursements, annulations ou transactions non exécutées.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s12ter")}>
        <p>
          MoveSpot est assujettie aux obligations de tiers déclarant prévues par l'{" "}
          <strong>article 242 bis du Code général des impôts</strong> (transposition de la directive
          DAC7 — Directive 2021/514/UE). À ce titre, MoveSpot et son prestataire de paiement{" "}
          <strong>Stripe Connect</strong> collectent les informations fiscales (NIF, SIREN ou NIR)
          de chaque bénéficiaire de revenus sur la Plateforme et{" "}
          <strong>
            transmettent annuellement à l'administration fiscale française un récapitulatif des
            sommes versées à chaque utilisateur
          </strong>
          . Ce récapitulatif est également adressé directement à l'utilisateur concerné avant le{" "}
          <strong>31 janvier de chaque année</strong> pour les sommes perçues au cours de l'année
          civile précédente.
        </p>
        <p>
          <strong>
            Imposition dès le premier euro pour les Conducteurs Particuliers (consommateurs).
          </strong>{" "}
          Conformément à l'article 242 bis du CGI et aux règles générales de l'impôt sur le revenu,{" "}
          <strong>
            les revenus perçus via la Plateforme sont imposables dès le premier euro versé
          </strong>
          , sans abattement ni franchise. Il n'existe pas de seuil de non-imposition pour les
          revenus de location de support publicitaire mobile. Chaque Conducteur Particulier est seul
          responsable de la déclaration de ces revenus à l'administration fiscale (case appropriée
          de la déclaration annuelle de revenus 2042) et du règlement des impositions correspondantes.
        </p>
        <p>
          Chaque bénéficiaire (propriétaire de véhicule, poseur certifié, apporteur d'affaires) est
          seul responsable de la déclaration de ses revenus perçus via la Plateforme auprès de
          l'administration fiscale compétente et du règlement des impositions correspondantes.
        </p>
        <p>
          Les propriétaires de véhicules personnes physiques (particuliers) sont informés que, si
          leur activité sur la Plateforme présente un caractère régulier ou génère des revenus
          excédant les seuils légaux en vigueur, ils peuvent être tenus de s'immatriculer sous un
          statut professionnel (notamment micro-entrepreneur) et d'acquitter les cotisations sociales
          afférentes. MoveSpot ne fournit pas de conseil fiscal ou social ; les utilisateurs sont
          invités à se rapprocher d'un expert-comptable ou de l'URSSAF pour toute question relative à
          leur situation personnelle.
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
          Les relevés de géolocalisation transmis par les chauffeurs sont agrégés (distance parcourue,
          minutes actives, part du trajet effectuée à l'intérieur de la zone de ciblage) et
          restitués à l'annonceur dans son tableau de suivi de campagne. Ces métriques, calculées
          côté serveur, constituent la base contractuelle des reversements.
        </p>
        <p>
          Les positions sont mises en mémoire tampon sur le terminal du chauffeur (y compris en mémoire
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
          MoveSpot. Ni le chauffeur ni le propriétaire du véhicule ne peuvent procéder eux-mêmes à la
          pose. Le support publicitaire (vinyle adhésif, covering, sticker) est imprimé et apporté
          sur site par le poseur certifié, à partir du fichier validé par MoveSpot. L'annonceur
          n'a pas à livrer de support physique au poseur ni au propriétaire du véhicule ; le
          propriétaire du véhicule ne réceptionne, ne stocke ni ne transporte aucun matériau
          publicitaire.
        </p>
        <p>
          Après pose, le poseur certifié transmet lui-même, depuis son espace prestataire de la
          Plateforme, quatre photographies du véhicule (face avant, côté gauche, côté droit, face
          arrière). MoveSpot peut y procéder à titre subsidiaire en cas d'empêchement technique du
          poseur. La campagne passe alors au statut « en attente de validation ». MoveSpot peut
          approuver ou refuser la pose ; en cas de refus motivé, une nouvelle pose conforme par un
          poseur certifié est requise avant tout démarrage de la diffusion et de la rémunération.
        </p>
        <p>
          <strong>Point de départ de la durée de campagne.</strong> Le décompte de la durée
          contractuelle de la campagne publicitaire ne commence qu'à compter de la{" "}
          <strong>validation effective des photographies de pose</strong> par MoveSpot. Aucune
          journée antérieure à cette validation n'entre dans le calcul de la durée de diffusion ni
          dans la base de rémunération du propriétaire du véhicule.
        </p>
        <p>
          <strong>Absence du prestataire poseur indépendant (no-show).</strong> Dans l'hypothèse
          où le prestataire poseur indépendant ne se présente pas au rendez-vous prévu sans avoir
          préalablement notifié MoveSpot, MoveSpot s'engage{" "}
          <strong>exclusivement à reprogrammer le rendez-vous</strong> dans les meilleurs délais,
          sans frais supplémentaires pour l'annonceur ou le propriétaire du véhicule. Aucune
          indemnité, pénalité ou compensation financière ne peut être réclamée à MoveSpot du fait
          de l'absence d'un prestataire indépendant. Le prestataire poseur est seul responsable des
          conséquences de son absence vis-à-vis de MoveSpot, conformément aux dispositions du
          contrat de prestation applicable (contrat prestataire poseur, art. 5).
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s15bis")}>
        <p>
          Si, après validation d'une campagne et paiement par l'annonceur, le poseur certifié
          constate que la pose est techniquement impossible (surface incompatible, état du véhicule
          ou contrainte matérielle indépendante de la volonté des parties), il doit le signaler{" "}
          <strong>dans les 24 heures suivant le constat</strong> via le bouton « Signaler une pose
          impossible » de son espace prestataire, en joignant obligatoirement{" "}
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
          l'itinéraire réel dépendant de la circulation et de l'activité du chauffeur.
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
          Certaines situations indépendantes de la volonté du chauffeur ou du propriétaire du véhicule
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
          Dans ces situations, le chauffeur ou le propriétaire peut{" "}
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
          chauffeur, poseur) dont la mise en contact a été réalisée via MoveSpot doit être
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
          été effectuée par son intermédiaire, pendant une durée de{" "}
          <strong>douze (12) mois</strong> suivant la date de la mise en relation initiale ou de la
          fin de la dernière campagne réalisée en commun.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s24")}>
        <p>
          Lorsqu'un propriétaire de véhicule signale un problème sur le support publicitaire
          vinyle apposé par un prestataire certifié MoveSpot (décollement, déchirure, dégradation),
          la résolution de l'incident suit la procédure de constat contradictoire décrite ci-après.
        </p>
        <ol className="mt-2 space-y-2 list-decimal list-inside">
          <li>
            <strong>Obligation de preuve photo du propriétaire.</strong> Tout signalement portant
            sur un incident de type « décollement / dégradation vinyle » doit être accompagné{" "}
            <em>d'au moins deux photographies</em> : une vue d'ensemble du véhicule et un gros
            plan de la zone endommagée. La soumission est bloquée tant que ces deux photos ne
            sont pas téléchargées. Les photos sont horodatées et conservées dans le système pour
            la durée du litige.
          </li>
          <li>
            <strong>Délai de confirmation du poseur (48 heures).</strong> Dès réception du
            signalement, le prestataire qui a effectué la pose est automatiquement notifié. Il
            dispose d'un délai de <strong>48 heures</strong> pour soumettre son propre constat
            contradictoire : deux photos minimum de son intervention, un diagnostic parmi les
            quatre catégories officielles (défaut d'installation, défaut de matériau, mauvais
            usage propriétaire, dommage extérieur) et des notes complémentaires. Passé ce délai,
            l'arbitrage est effectué par MoveSpot sur la base des seuls éléments disponibles.
          </li>
          <li>
            <strong>Arbitrage et répartition de la responsabilité.</strong> L'équipe MoveSpot
            examine les trois séries de photos (pose initiale, signalement propriétaire, constat
            poseur) et rend une décision dans un délai raisonnable :
            <ul className="mt-1 ml-4 space-y-1 list-disc">
              <li>
                <strong>Repose gratuite validée</strong> : si le diagnostic retenu est un défaut
                d'installation ou un défaut de matériau, MoveSpot prend en charge la repose sans
                frais supplémentaires pour l'annonceur et le propriétaire.
              </li>
              <li>
                <strong>Rejet / frais à la charge du propriétaire</strong> : si le diagnostic
                retenu est un mauvais usage ou un dommage extérieur imputable au propriétaire,
                les frais de remplacement sont à la charge de ce dernier, conformément aux CGV.
              </li>
            </ul>
          </li>
        </ol>
        <p className="mt-2">
          La campagne est automatiquement mise en pause (statut{" "}
          <em>« vérification d'incident »</em>) dès l'ouverture du constat et reprend son cours
          normal après la résolution.
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s25_contradictoire", { defaultValue: "Article 25 — Constat contradictoire pour les incidents vinyle" })}>
        <p>
          Lorsqu'un propriétaire de véhicule signale un problème relatif au vinyle publicitaire
          (décollement, dégradation), la Plateforme met en œuvre un <strong>constat
          contradictoire</strong> impliquant le prestataire poseur certifié qui a effectué la pose.
        </p>
        <p className="mt-2">
          <strong>Procédure de signalement.</strong> Le signalement ne peut être soumis qu'accompagné
          d'au moins <strong>deux (2) photographies</strong> documentant l'état du vinyle. Le dépôt
          de ces photos est obligatoire ; à défaut, le formulaire de signalement est bloqué. La
          campagne publicitaire associée est automatiquement mise en pause le temps de la vérification.
        </p>
        <p className="mt-2">
          <strong>Délai de réponse du poseur.</strong> Le prestataire poseur dispose de{" "}
          <strong>48 heures</strong> à compter de la notification pour confirmer le constat. Cette
          confirmation doit être accompagnée d'au moins deux (2) photographies de sa propre
          inspection ainsi que d'un diagnostic choisi parmi les causes suivantes : défaut de pose,
          défaut matière, mauvais usage par le propriétaire ou dommage extérieur. Passé ce délai,
          MoveSpot se réserve le droit de statuer en faveur du propriétaire.
        </p>
        <p className="mt-2">
          <strong>Arbitrage par MoveSpot.</strong> À réception du constat contradictoire (photos
          propriétaire + photos poseur + diagnostic), l'équipe MoveSpot dispose d'un droit
          d'arbitrage et peut décider :
        </p>
        <ul className="list-disc list-inside mt-1 ml-4 space-y-0.5">
          <li>
            <strong>Repose gratuite :</strong> le poseur est tenu d'effectuer une nouvelle pose sans
            frais supplémentaires pour le propriétaire, si le diagnostic retenu est un défaut de pose
            ou un défaut matière.
          </li>
          <li>
            <strong>Rejet de la réclamation :</strong> la réclamation est rejetée si le diagnostic
            retenu indique un mauvais usage par le propriétaire ou un dommage extérieur imputable
            à ce dernier (retrait volontaire anticipé du vinyle inclus). Dans ce cas, les frais de
            réimpression et de nouvelle pose par l'atelier agréé sont facturés au Propriétaire selon
            le barème forfaitaire TTC suivant :
            <ul className="list-disc list-inside mt-1.5 ml-4 space-y-0.5 text-sm">
              <li>
                <strong>Support simple</strong> (lunette arrière ou 1 panneau latéral) :{" "}
                <strong>49 € TTC</strong>
              </li>
              <li>
                <strong>Support double</strong> (2 portières latérales) :{" "}
                <strong>69 € TTC</strong>
              </li>
              <li>
                <strong>Support complet / grand format</strong> (2 portières + lunette arrière, ou
                véhicule utilitaire / van) : <strong>89 € TTC</strong>
              </li>
            </ul>
            <p className="mt-1.5 text-sm">
              Ce montant forfaitaire couvre l'intégralité des frais de réimpression du support et de
              la nouvelle pose par l'atelier agréé MoveSpot. Il pourra être compensé directement sur
              les sommes en attente de versement au Propriétaire ou réglé par carte bancaire ; dans
              ce dernier cas, aucune nouvelle campagne ne sera attribuée au véhicule tant que le
              règlement n'aura pas été réceptionné.
            </p>
          </li>
        </ul>
        <p className="mt-2">
          <strong>Notification.</strong> Le propriétaire et le poseur sont notifiés par email et par
          notification push de chaque étape de la procédure.
        </p>
        <p className="mt-2">
          <strong>Conservation des preuves.</strong> Les photographies déposées dans le cadre du
          constat contradictoire sont conservées pendant toute la durée de la procédure et au moins
          trente (30) jours après sa clôture.
        </p>
      </LegalSection>

      <LegalSection title="Article X — Responsabilité automobile et assurances">
        <p>
          <strong>X.1 — Statut de la Plateforme.</strong> MoveSpot, exploitée par Garry PALERME,
          Entrepreneur individuel (EI) — SIREN 804 671 444, agit exclusivement en qualité
          d'intermédiaire de mise en relation entre Annonceurs, Propriétaires de véhicules et
          Prestataires de pose. MoveSpot n'a ni la garde juridique, ni l'usage, ni la direction du
          véhicule au sens de l'article 1242, alinéa 1er du Code civil. La seule présence d'un
          support publicitaire MoveSpot sur un véhicule ne confère pas à MoveSpot la qualité de
          gardien du véhicule.
        </p>
        <p className="mt-2">
          <strong>X.2 — Obligation d'assurance du Propriétaire et du Chauffeur.</strong> Tout
          Propriétaire et tout Chauffeur inscrit sur la Plateforme s'engage à être titulaire, pour
          chaque véhicule enregistré, d'un contrat d'assurance automobile en cours de validité
          couvrant au minimum la responsabilité civile obligatoire (art. L. 211-1 du Code des
          assurances). Sur simple demande de MoveSpot ou d'un Annonceur, l'attestation d'assurance
          doit être fournie dans un délai de quarante-huit (48) heures. Le défaut de fourniture
          entraîne la suspension immédiate du véhicule et de ses campagnes en cours.
        </p>
        <p className="mt-2">
          <strong>X.3 — Décharge de responsabilité de MoveSpot.</strong> MoveSpot ne saurait être
          tenue responsable, à quelque titre que ce soit, des dommages corporels, matériels ou
          immatériels causés à des tiers ou aux parties dans le cadre de la conduite ou de
          l'utilisation d'un véhicule enregistré sur la Plateforme. Toute réclamation relative à un
          accident de la circulation impliquant un véhicule partenaire doit être adressée directement
          à l'assureur du Propriétaire ou du Chauffeur. L'Annonceur reconnaît qu'aucune
          responsabilité ne peut être imputée à MoveSpot du seul fait que son logo ou sa création
          publicitaire figure sur le véhicule accidenté.
        </p>
        <p className="mt-2">
          <strong>X.4 — Signalement obligatoire et conservation des preuves.</strong> En cas
          d'accident impliquant un véhicule enregistré sur la Plateforme pendant une campagne active,
          le Propriétaire ou le Chauffeur est tenu de : (i) signaler l'événement à MoveSpot par
          email à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>{" "}
          dans un délai de vingt-quatre (24) heures ; (ii) conserver le constat amiable ou le
          procès-verbal de police ; (iii) photographier l'état du support publicitaire avant tout
          retrait ou remplacement. Le non-respect de cette obligation de signalement est susceptible
          d'engager la responsabilité du Propriétaire ou du Chauffeur à l'égard des autres parties.
        </p>
        <p className="mt-2">
          <strong>X.5 — Suspension de campagne et prise en charge des dommages.</strong> À
          réception du signalement, MoveSpot peut suspendre la campagne du véhicule concerné le
          temps de l'instruction. Si le support publicitaire est endommagé, les frais de
          réimpression et de nouvelle pose sont à la charge du Propriétaire ou du Chauffeur
          responsable, sauf si le dommage est exclusivement imputable à un tiers identifié. La
          suspension de campagne du fait de l'accident ne donne droit à aucune indemnité de la part
          de MoveSpot.
        </p>
        <p className="mt-2">
          <strong>X.6 — Limitation de responsabilité selon le statut de l'utilisateur.</strong>{" "}
          Pour les <strong>Utilisateurs agissant à titre professionnel</strong> (Annonceurs
          personnes morales, propriétaires de flotte, prestataires), la responsabilité de MoveSpot
          au titre des présentes CGU est plafonnée à{" "}
          <strong>5 000 € par événement</strong>, tous préjudices confondus, à l'exclusion des dommages
          indirects, pertes d'exploitation, manque à gagner ou atteinte à l'image.
        </p>
        <p className="mt-2">
          Pour les <strong>Conducteurs Particuliers agissant en qualité de consommateurs</strong>{" "}
          au sens du Code de la consommation, la responsabilité de Garry PALERME, Entrepreneur
          individuel (MoveSpot), demeure régie par le droit commun français. En cas de manquement
          prouvé de MoveSpot à ses obligations d'opérateur de plateforme, l'utilisateur
          consommateur peut solliciter l'indemnisation de son préjudice direct réel selon les règles
          du droit de la responsabilité civile. Aucune clause des présentes CGU ne saurait
          exclure ou limiter la responsabilité de MoveSpot pour des dommages causés par une faute
          lourde ou dolosive, ni restreindre les droits légaux des consommateurs reconnus par le
          Code de la consommation.
        </p>
        <p className="mt-2">
          Les <strong>Associations loi 1901 agissant à titre non lucratif</strong> (dont l'objet
          social exclut toute activité commerciale à titre principal) bénéficient du{" "}
          <strong>régime protecteur des non-professionnels</strong> prévu par le Code de la
          consommation, en ce qui concerne notamment la limitation de responsabilité et les règles
          de juridiction compétente définies ci-après. Sont considérées comme agissant à titre
          professionnel les associations exerçant une activité économique à titre habituel, même
          sans but lucratif, dès lors que ladite activité entre dans le champ d'application des
          règles commerciales (notamment les associations soumises à la TVA ou employant du
          personnel salarié à titre principal).
        </p>
      </LegalSection>

      <LegalSection title={t("cgu.s23")}>
        <p>
          Les présentes CGU sont régies par le <strong>droit français</strong>.
        </p>
        <p className="mt-2">
          <strong>Utilisateurs professionnels.</strong> Pour tout litige entre MoveSpot et un
          utilisateur agissant à titre professionnel (Annonceur personne morale, propriétaire de
          flotte, prestataire poseur ou partenaire commercial), les parties conviennent de la
          compétence exclusive du{" "}
          <strong>Tribunal de Commerce ou du Tribunal judiciaire de Pointe-à-Pitre (Guadeloupe)</strong>,
          même en cas de pluralité de défendeurs ou d'appel en garantie, sauf disposition légale
          impérative contraire.
        </p>
        <p className="mt-2">
          <strong>Conducteurs Particuliers (consommateurs) et Associations non lucratives.</strong>{" "}
          Conformément aux articles R. 631-3 et R. 631-4 du Code de la consommation, le
          Conducteur Particulier agissant en qualité de consommateur, ainsi que toute Association
          loi 1901 agissant à titre non lucratif au sens défini à l'article X.6 ci-dessus, peut
          saisir, à son choix, le tribunal compétent du lieu de son{" "}
          <strong>domicile ou siège social au moment de la conclusion du contrat</strong>, du lieu
          de la <strong>prestation de service</strong>, ou du lieu du siège social de MoveSpot
          (Pointe-à-Pitre). Toute clause qui contraindrait le non-professionnel à se soumettre
          exclusivement à la juridiction du siège de MoveSpot serait réputée non écrite au sens
          de l'article R. 212-2 du Code de la consommation.
        </p>
        <p className="mt-2">
          <strong>Médiation préalable obligatoire (art. L.612-1 C.conso.).</strong> Avant toute
          action judiciaire, le consommateur est invité à soumettre son litige au médiateur agréé
          de MoveSpot. Cette démarche est gratuite, confidentielle et sans obligation de résultat.
          Le médiateur désigné est :{" "}
          <strong>CM2C</strong> (Centre de Médiation et d'Arbitrage de la Consommation) — 49 Rue
          de Ponthieu, 75008 Paris —{" "}
          <a
            href="https://cm2c.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            https://cm2c.net
          </a>
          . Pour les litiges transfrontaliers (résidence hors de France), la médiation peut
          également être initiée via la plateforme européenne de Règlement en Ligne des Litiges
          (RLL) de la Commission européenne :{" "}
          <a
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            https://ec.europa.eu/consumers/odr
          </a>
          . L'adresse électronique de MoveSpot pour la saisine :{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
          . En cas d'échec de la médiation dans un délai de 90 jours, chaque partie recouvre la
          liberté d'agir en justice.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
