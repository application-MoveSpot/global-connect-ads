import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — MoveSpot" },
      { name: "description", content: "CGU MoveSpot : accès au service, charte publicitaire, obligations des chauffeurs, calcul du budget de zone, flux financiers et sécurité des comptes." },
      { property: "og:title", content: "Conditions Générales d'Utilisation — MoveSpot" },
      { property: "og:description", content: "Règles d'accès et d'usage de la marketplace de publicité mobile MoveSpot." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/cgu" }],
  }),

  component: CGU,
});

function CGU() {
  return (
    <LegalPage eyebrow="Mentions légales" title="Conditions Générales d'Utilisation" updatedAt="12 août 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») ont pour objet de définir les modalités
          et conditions dans lesquelles MoveSpot (ci-après « la Plateforme ») met à disposition de ses utilisateurs ses
          services de visualisation de la mobilité mondiale en temps réel et de réservation d'emplacements publicitaires.
        </p>
        <p>
          L'accès et l'utilisation de la Plateforme impliquent l'acceptation pleine et entière des présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="2. Éditeur du site">
        <p>
          La Plateforme MoveSpot est éditée par <strong>RAKOUN KLUB</strong>, entreprise individuelle.
          Adresse postale de l'entreprise : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
          (Guadeloupe, France). SIRET : 804 671 444 00052. Contact :{" "}
          <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline">contact@notify.move-spot.com</a>.
        </p>

      </LegalSection>

      <LegalSection title="3. Accès au service">
        <p>
          La Plateforme est accessible gratuitement à tout utilisateur disposant d'un accès à Internet. Les coûts liés
          à l'accès au service (matériel, logiciels, connexion Internet) sont à la charge exclusive de l'utilisateur.
        </p>
        <p>
          Les mises à jour courantes de la Plateforme sont conçues pour s'effectuer sans interruption de session,
          conformément aux dispositions de l'article 20 « Continuité de service lors des mises à jour ».
        </p>
        <p>
          Indépendamment de ces mises à jour courantes, MoveSpot se réserve le droit de suspendre, interrompre ou
          limiter temporairement l'accès à tout ou partie du service, sans préavis ni indemnité, en cas de maintenance
          exceptionnelle, d'incident technique, de force majeure ou pour des motifs de sécurité.
        </p>
      </LegalSection>

      <LegalSection title="4. Compte utilisateur">
        <p>
          Certaines fonctionnalités nécessitent la création d'un compte. L'utilisateur s'engage à fournir des
          informations exactes, complètes et à jour. Il est responsable de la confidentialité de ses identifiants
          et de toute action effectuée depuis son compte.
        </p>
      </LegalSection>

      <LegalSection title="5. Obligations de l'utilisateur">
        <p>L'utilisateur s'engage à :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>respecter la législation française et internationale en vigueur ;</li>
          <li>ne pas porter atteinte aux droits de tiers ;</li>
          <li>ne pas perturber le fonctionnement de la Plateforme ;</li>
          <li>ne soumettre que des campagnes publicitaires conformes à la charte de contenu de MoveSpot.</li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Charte de contenu publicitaire">
        <p>
          Sont strictement refusées toutes campagnes à caractère religieux ou de fêtes religieuses, politique ou
          électoral (partis, candidats, mouvements, propagande, élections), sexistes, pornographiques, ou incitant à la
          violence sous toutes ses formes. Sont également exclus les messages d'anniversaires personnels et plus
          largement tout contenu privé à caractère célébratoire individuel. MoveSpot se réserve le droit de refuser
          toute campagne ne respectant pas cette charte, sans avoir à se justifier ni à rembourser les frais déjà
          engagés au titre du contrôle éditorial.
        </p>
      </LegalSection>

      <LegalSection title="7. Propriété intellectuelle">
        <p>
          L'ensemble des éléments composant la Plateforme (textes, graphismes, logos, icônes, images, données) est la
          propriété exclusive de MoveSpot ou de ses partenaires. Toute reproduction, représentation ou exploitation,
          totale ou partielle, est strictement interdite sans autorisation préalable et écrite.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité">
        <p>
          MoveSpot s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées, sans garantie
          d'exhaustivité. La Plateforme ne saurait être tenue responsable des dommages directs ou indirects résultant
          de l'utilisation du service ou de l'impossibilité d'y accéder.
        </p>
      </LegalSection>

      <LegalSection title="9. Modification des CGU">
        <p>
          MoveSpot se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés
          de toute modification substantielle. La version applicable est celle en vigueur à la date d'utilisation.
        </p>
      </LegalSection>

      <LegalSection title="10. Rôle de la plateforme — simple intermédiaire">
        <p>
          MoveSpot est un intermédiaire numérique de mise en relation entre annonceurs, propriétaires de véhicules,
          chauffeurs et poseurs certifiés. MoveSpot ne possède aucun véhicule, aucun matériel d'affichage et n'exerce
          aucune activité de transport ni de pose de covering.
        </p>
        <p>
          En conséquence, MoveSpot est totalement exonérée de responsabilité concernant l'état mécanique, l'entretien,
          l'assurance ou la conformité réglementaire des véhicules, ainsi que concernant les défauts de pose, de
          décollement, de bullage ou de dégradation du vinyle publicitaire. Ces responsabilités relèvent exclusivement
          des propriétaires de véhicules et des poseurs certifiés, qui agissent en tant que professionnels
          indépendants.
        </p>
      </LegalSection>

      <LegalSection title="11. Obligations des chauffeurs">
        <p>Le chauffeur participant à une campagne s'engage à :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            activer et maintenir actif le module de géolocalisation en arrière-plan pendant l'ensemble de ses heures de
            conduite déclarées ; toute période non couverte par des relevés GPS n'est pas comptabilisée et ne donne
            lieu à aucune rémunération ;
          </li>
          <li>ne pas altérer, falsifier ou simuler les données de géolocalisation transmises à la Plateforme ;</li>
          <li>respecter le code de la route et l'ensemble de la réglementation applicable à son activité ;</li>
          <li>maintenir le visuel publicitaire propre, visible et intact pendant toute la durée de la campagne ;</li>
          <li>signaler sans délai tout sinistre, retrait ou dégradation du support publicitaire.</li>
        </ul>
      </LegalSection>

      <LegalSection title="12. Flux financiers et reversements">
        <p>
          Les paiements des annonceurs sont encaissés via Stripe (ou par virement bancaire pour les budgets B2B) et
          conservés en séquestre par l'intermédiaire de Stripe Connect jusqu'à l'exécution de la campagne. MoveSpot
          prélève une commission d'intermédiation de 30 % du montant hors taxes ; 70 % sont destinés au propriétaire du
          véhicule, au chauffeur et, le cas échéant, au poseur certifié.
        </p>
        <p>
          Les gains sont cumulés sur le compte du bénéficiaire et deviennent exigibles après validation des métriques
          de campagne (distance parcourue dans la zone de ciblage, minutes actives et taux de couverture). Le
          reversement est conditionné à la finalisation de l'inscription Stripe Connect du bénéficiaire (identité
          vérifiée et IBAN valide). En cas d'anomalie de suivi, de fraude présumée ou de non-respect des obligations
          ci-dessus, MoveSpot peut suspendre le reversement le temps de l'instruction du dossier.
        </p>
      </LegalSection>

      <LegalSection title="13. Calcul du budget et zones de diffusion">
        <p>
          L'annonceur définit sa zone de diffusion en dessinant un polygone sur la carte interactive. Le budget
          indicatif est calculé automatiquement à partir de la surface réelle de la zone (base de 1,80 € par km² et
          par jour), majorée d'un coefficient de densité de 1,5× (soit 2,70 € par km² et par jour) pour les grandes
          agglomérations. Un montant plancher de 10 € par campagne s'applique.
        </p>
        <p>
          Ce montant est un devis indicatif calculé par la Plateforme ; il est présenté à l'annonceur pour validation
          avant tout paiement et ne constitue pas une garantie de volume d'impressions.
        </p>
      </LegalSection>

      <LegalSection title="14. Mesure de performance et preuve de diffusion">
        <p>
          Les relevés de géolocalisation transmis par les chauffeurs sont agrégés (distance parcourue, minutes
          actives, part du trajet effectuée à l'intérieur de la zone de ciblage) et restitués à l'annonceur dans son
          tableau de suivi de campagne. Ces métriques constituent la base contractuelle de la facturation et des
          reversements.
        </p>
        <p>
          Les positions sont mises en mémoire tampon sur le terminal du chauffeur puis envoyées par lots afin de
          limiter la consommation de données ; une interruption de réseau n'entraîne donc pas de perte de relevés,
          mais l'absence prolongée de relevés rend la période concernée non comptabilisable.
        </p>
      </LegalSection>

      <LegalSection title="15. Validation de la pose du support publicitaire">
        <p>
          La pose du covering est réalisée exclusivement par un poseur professionnel certifié MoveSpot. Ni le
          chauffeur ni le propriétaire du véhicule ne peuvent procéder eux-mêmes à la pose. Après pose, le poseur
          certifié transmet lui-même, depuis son espace prestataire de la Plateforme, quatre photographies du
          véhicule (face avant, côté gauche, côté droit, face arrière). MoveSpot peut y procéder à titre
          subsidiaire en cas d'empêchement technique du poseur. La campagne passe alors au statut « en attente de
          validation ». MoveSpot peut approuver ou refuser la pose ; en cas de refus motivé, une nouvelle pose
          conforme par un poseur certifié est requise avant tout démarrage de la diffusion et de la rémunération.
        </p>
      </LegalSection>


      <LegalSection title="16. Sécurité des comptes">
        <p>
          La Plateforme met à disposition une authentification à deux facteurs (application d'authentification / TOTP)
          activable depuis l'espace « Sécurité ». Son activation est fortement recommandée pour tout compte associé à
          des flux financiers. L'utilisateur demeure responsable de la conservation de ses codes et de son secret
          d'authentification.
        </p>
      </LegalSection>

      <LegalSection title="17. Intégrations et accès automatisés">
        <p>
          MoveSpot expose des intégrations pour agents et outils tiers permettant, après autorisation explicite de
          l'utilisateur, la consultation en lecture de ses propres données (flotte, briefs, campagnes, solde de
          portefeuille). Aucun accès n'est accordé sans consentement, et l'utilisateur peut le révoquer à tout moment.
        </p>
      </LegalSection>

      <LegalSection title="18. Notifications et communications">
        <p>
          MoveSpot adresse à l'utilisateur des <strong>emails de service</strong> liés à l'exécution du contrat :
          activation d'une campagne, confirmation de réception d'un virement, décision de modération d'une création ou
          d'un véhicule, alertes de sécurité du compte. Ces messages sont nécessaires au fonctionnement du service et
          ne peuvent pas être désactivés tant que le compte est actif.
        </p>
        <p>
          Les emails d'information commerciale sont distincts et n'ont lieu qu'avec consentement. Chacun comporte un
          lien de désinscription immédiate, également accessible depuis la page{" "}
          <a href="/unsubscribe" className="text-primary hover:underline">de désinscription</a>. Les emails sont
          expédiés depuis le domaine <strong>notify.move-spot.com</strong> : tout message présenté comme provenant de
          MoveSpot depuis une autre adresse doit être considéré comme suspect.
        </p>
      </LegalSection>

      <LegalSection title="19. Planification automatique de l'itinéraire">
        <p>
          Lors de la création d'un brief, l'annonceur saisit des étapes (adresses ou lieux). La Plateforme les
          géocode automatiquement, calcule le tracé routier, identifie les quartiers traversés et les points
          d'intérêt situés à proximité du trajet, puis en déduit une estimation d'impressions quotidiennes
          (distance × densité de trafic × coefficients de format, de mobilité et de plage horaire).
        </p>
        <p>
          Cette estimation est une <strong>projection statistique indicative</strong> destinée au dimensionnement de
          la campagne. Elle ne constitue ni un engagement de résultat, ni une garantie de volume d'impressions ou de
          passage effectif par les étapes indiquées, l'itinéraire réel dépendant de la circulation et de l'activité
          du chauffeur.
        </p>
      </LegalSection>

      <LegalSection title="20. Continuité de service lors des mises à jour">
        <p>
          La Plateforme est mise à jour en continu. Ces mises à jour sont conçues pour ne pas interrompre la session
          de l'utilisateur : le rechargement d'une nouvelle version de l'application s'effectue de façon transparente
          et la session connectée est préservée. Une reconnexion peut toutefois rester nécessaire en cas d'expiration
          normale du jeton d'authentification ou de déconnexion volontaire.
        </p>
      </LegalSection>

      <LegalSection title="21. Droit applicable et juridiction">

        <p>
          Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou exécution
          relève de la compétence exclusive des tribunaux français.
        </p>
      </LegalSection>

    </LegalPage>
  );
}
