import { createFileRoute } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/contrat-poseurs")({
  head: () => ({
    meta: [
      { title: "Contrat Prestataire Poseur — MoveSpot" },
      {
        name: "description",
        content:
          "Conditions d'intervention des prestataires poseurs (installateurs de supports publicitaires) sur la plateforme MoveSpot.",
      },
      { property: "og:title", content: "Contrat Prestataire Poseur — MoveSpot" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/contrat-poseurs" },
      ...hreflangLinks("/contrat-poseurs"),
    ],
  }),

  component: ContratPoseurs,
});

function ContratPoseurs() {
  return (
    <LegalPage
      eyebrow="Document contractuel"
      title="Contrat de prestation — Poseur indépendant MoveSpot"
      updatedAt="25 novembre 2026"
    >
      <LegalSection title="Parties">
        <p>
          Le présent contrat est conclu entre :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>MoveSpot</strong>, exploitée par Garry PALERME, Entrepreneur individuel (EI) —
            SIREN 804 671 444, 1 Lot Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
            (Guadeloupe, France), ci-après « MoveSpot » ;
          </li>
          <li>
            <strong>Le Prestataire</strong> : toute personne physique ou morale inscrite sur la
            Plateforme MoveSpot en qualité de poseur indépendant, ci-après « le Prestataire ».
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Article 1 — Objet et statut indépendant">
        <p>
          Le présent contrat a pour objet de définir les conditions dans lesquelles le Prestataire
          réalise, à titre indépendant, des prestations d'installation et de dépose de supports
          publicitaires vinyle sur des véhicules partenaires de la Plateforme.
        </p>
        <p className="mt-2">
          Le Prestataire intervient en tant que professionnel indépendant. Aucun lien de
          subordination ni contrat de travail n'est créé entre MoveSpot et le Prestataire. Le
          Prestataire est seul responsable de son organisation, de ses outils et de ses horaires.
          MoveSpot ne lui impose aucune exclusivité.
        </p>
      </LegalSection>

      <LegalSection title="Article 2 — Assurance responsabilité civile professionnelle obligatoire">
        <p>
          Avant toute première intervention, le Prestataire doit fournir à MoveSpot une attestation
          d'assurance Responsabilité Civile Professionnelle (RC Pro) en cours de validité, couvrant
          expressément les dommages causés aux <strong>biens confiés</strong> (véhicules sur
          lesquels il intervient) et les dommages corporels, matériels et immatériels susceptibles
          d'être causés à des tiers dans le cadre de ses prestations.
        </p>
        <p className="mt-2">
          L'attestation doit être renouvelée chaque année. Toute intervention réalisée sans
          couverture valide engage la responsabilité exclusive du Prestataire. MoveSpot se réserve
          le droit de suspendre ou de résilier le présent contrat en cas de défaut d'assurance
          constaté.
        </p>
        <p className="mt-2">
          Le Prestataire transmet son attestation par email à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>{" "}
          ou via la section « Documents » de son espace Prestataire sur la Plateforme.
        </p>
      </LegalSection>

      <LegalSection title="Article 3 — Protocole photographique obligatoire">
        <p>
          Pour chaque intervention (pose ou dépose), le Prestataire est tenu de réaliser et de
          déposer sur la Plateforme, dans un délai de deux (2) heures suivant la fin de
          l'intervention, un jeu complet de photographies horodatées comportant :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>Avant pose</strong> : état général du véhicule (4 faces : avant, arrière, côté
            conducteur, côté passager) et état de la carrosserie à l'emplacement du support.
          </li>
          <li>
            <strong>Après pose</strong> : support posé sous les mêmes 4 angles, plus un détail de
            chaque raccord et angle du vinyl.
          </li>
          <li>
            <strong>Avant dépose</strong> : état du support avant retrait.
          </li>
          <li>
            <strong>Après dépose</strong> : état de la carrosserie après retrait, confirmant
            l'absence de dommage résiduel.
          </li>
        </ul>
        <p className="mt-2">
          Ces photographies constituent la preuve contradictoire opposable en cas de litige sur
          l'état du véhicule. Leur absence ou leur incomplétude engage la responsabilité du
          Prestataire pour tout dommage dont l'origine ne peut être établie.
        </p>
      </LegalSection>

      <LegalSection title="Article 4 — Obligations de qualité et de sécurité">
        <p>
          Le Prestataire s'engage à :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            Utiliser exclusivement des supports vinyle conformes aux spécifications transmises par
            MoveSpot (dimensions, matière, finition) ;
          </li>
          <li>
            Nettoyer et dégraisser la carrosserie avant toute pose afin de garantir l'adhérence du
            support ;
          </li>
          <li>
            Ne jamais poser un support sur une surface présentant une rouille active, une peinture
            décollée ou un impact susceptible d'aggraver les dommages lors du retrait ;
          </li>
          <li>
            Signaler à MoveSpot par écrit tout défaut préexistant constaté sur le véhicule avant
            de débuter l'intervention ;
          </li>
          <li>
            Respecter les règles de sécurité applicables (port des EPI, intervention sur voie
            privée ou zone sécurisée).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Article 5 — Ponctualité et absence injustifiée (no-show)">
        <p>
          Le Prestataire s'engage à être présent au lieu et à l'heure convenus avec MoveSpot pour
          chaque intervention planifiée. Tout empêchement doit être signalé à MoveSpot{" "}
          <strong>au moins vingt-quatre (24) heures avant le rendez-vous</strong>, par email à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>{" "}
          ou via la messagerie de son espace Prestataire, en indiquant le motif et en proposant
          une date de remplacement dans les quarante-huit (48) heures.
        </p>
        <p className="mt-2">
          <strong>Absence injustifiée (no-show).</strong> Est considérée comme absence injustifiée
          toute non-présentation sans signalement préalable dans le délai ci-dessus, ou tout
          signalement intervenu postérieurement à l'heure du rendez-vous. En cas d'absence
          injustifiée :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>Aucun honoraire</strong> n'est dû au Prestataire pour la mission concernée,
            y compris les frais de déplacement éventuellement engagés ;
          </li>
          <li>
            Le Prestataire demeure <strong>responsable des supports vinyles</strong> déjà confiés
            par MoveSpot et doit les restituer en parfait état dans un délai de quarante-huit
            (48) heures. À défaut, leur valeur est retenue sur les prochains honoraires dus
            ou fait l'objet d'une facturation séparée ;
          </li>
          <li>
            MoveSpot peut <strong>suspendre temporairement le compte</strong> du Prestataire sur
            la Plateforme, réaffecter la mission à un autre prestataire disponible, et imputer
            les éventuels frais de réaffectation d'urgence sur les sommes dues au Prestataire ;
          </li>
          <li>
            En cas de récidive (deux absences injustifiées sur une période de douze mois),
            MoveSpot peut résilier le présent contrat avec effet immédiat, sans indemnité,
            conformément à l'article 9.
          </li>
        </ul>
        <p className="mt-2">
          Le Prestataire reconnaît que le décompte de la durée de la campagne publicitaire associée
          ne prend effet qu'à compter de la <strong>validation des photographies de pose effective</strong>{" "}
          par MoveSpot. Toute absence retardant la pose n'entraîne aucune prolongation automatique
          de la campagne ni aucune obligation d'indemnisation de MoveSpot envers l'annonceur ou le
          propriétaire du véhicule du fait du Prestataire.
        </p>
      </LegalSection>

      <LegalSection title="Article 6 — Rémunération">
        <p>
          Les tarifs applicables à chaque type d'intervention (pose, dépose, dépose-repose) sont
          définis dans le barème transmis au Prestataire lors de son inscription et consultables
          dans son espace Prestataire.
        </p>
        <p className="mt-2">
          Le paiement est déclenché automatiquement par la Plateforme après validation des
          photographies par MoveSpot. Le délai de règlement est de sept (7) jours ouvrés à compter
          de la validation. En cas de photographies incomplètes, le paiement est suspendu jusqu'à
          régularisation.
        </p>
        <p className="mt-2">
          Le Prestataire est responsable de ses obligations fiscales et sociales (déclaration de
          chiffre d'affaires, cotisations, TVA le cas échéant). MoveSpot ne procède à aucune
          retenue à la source.
        </p>
      </LegalSection>

      <LegalSection title="Article 7 — Responsabilité et dommages au véhicule">
        <p>
          Le Prestataire est seul responsable des dommages causés au véhicule pendant son
          intervention. En cas de dommage constaté après la pose ou la dépose du support, MoveSpot
          peut retenir sur les sommes dues au Prestataire le montant des réparations justifiées,
          dans la limite de la franchise de son assurance RC Pro et après mise en demeure restée
          sans réponse sous quarante-huit (48) heures.
        </p>
        <p className="mt-2">
          Le Prestataire exonère expressément MoveSpot de toute responsabilité pour les accidents
          ou dommages survenus lors de ses déplacements vers ou depuis le lieu d'intervention.
        </p>
      </LegalSection>

      <LegalSection title="Article 8 — Confidentialité et non-contournement">
        <p>
          Le Prestataire s'engage à ne pas contacter directement les Propriétaires ou Annonceurs
          rencontrés via la Plateforme à des fins commerciales extérieures à MoveSpot, pendant toute
          la durée du contrat et durant les douze (12) mois suivant sa résiliation.
        </p>
        <p className="mt-2">
          Le Prestataire s'engage à maintenir confidentielles les informations commerciales,
          tarifaires et techniques dont il aura connaissance dans le cadre de ses interventions.
        </p>
      </LegalSection>

      <LegalSection title="Article 9 — Durée et résiliation">
        <p>
          Le présent contrat est conclu pour une durée indéterminée à compter de l'acceptation par
          le Prestataire lors de son inscription sur la Plateforme.
        </p>
        <p className="mt-2">
          Chaque partie peut résilier le contrat par email avec un préavis de quinze (15) jours.
          MoveSpot peut procéder à une résiliation immédiate et sans indemnité en cas de : défaut
          d'assurance, absence injustifiée répétée (art. 5), dommages répétés non couverts,
          violation du protocole photographique, contournement de la Plateforme ou comportement
          frauduleux.
        </p>
      </LegalSection>

      <LegalSection title="Article 10 — Droit applicable et litiges">
        <p>
          Le présent contrat est régi par le droit français. Tout litige sera soumis à la
          compétence des tribunaux de Pointe-à-Pitre (Guadeloupe), sauf disposition légale
          impérative contraire.
        </p>
        <p className="mt-2">
          En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute
          saisine juridictionnelle. Contact : {" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
