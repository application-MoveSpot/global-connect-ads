import { createFileRoute } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/contrat-creatifs")({
  head: () => ({
    meta: [
      { title: "Conditions d'Utilisation Prestataires Créatifs — MoveSpot" },
      {
        name: "description",
        content:
          "Conditions d'utilisation applicables aux Prestataires graphistes et vidéastes indépendants qui proposent leurs services sur la plateforme MoveSpot.",
      },
      {
        property: "og:title",
        content: "Conditions d'Utilisation Prestataires Créatifs — MoveSpot",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/contrat-creatifs" },
      ...hreflangLinks("/contrat-creatifs"),
    ],
  }),

  component: ContratCreatifs,
});

function ContratCreatifs() {
  return (
    <LegalPage
      eyebrow="Document contractuel"
      title="Conditions d'Utilisation — Prestataires Créatifs (Graphistes & Vidéastes)"
      updatedAt="25 novembre 2026"
    >
      {/* ── Parties ─────────────────────────────────────────────────────── */}
      <LegalSection title="Parties">
        <p>Le présent document est conclu entre :</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>MoveSpot</strong>, exploitée par Garry PALERME, Entrepreneur individuel (EI) —
            SIREN 804 671 444, 1 Lot Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
            (Guadeloupe, France), ci-après « MoveSpot » ou « la Plateforme » ;
          </li>
          <li>
            <strong>Le Prestataire Créatif</strong> : toute personne physique ou morale inscrite
            sur la Plateforme en qualité de graphiste ou de vidéaste indépendant, ci-après « le
            Prestataire ».
          </li>
        </ul>
      </LegalSection>

      {/* ── Article 1 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 1 — Rôle de MoveSpot : outil numérique de mise en relation">
        <p>
          MoveSpot est un <strong>outil numérique de mise en relation</strong> entre utilisateurs
          indépendants (Annonceurs, Propriétaires de véhicules, Poseurs, Graphistes et Vidéastes).
          MoveSpot n'est en aucun cas un employeur, un recruteur, un mandataire de recrutement ni
          un donneur d'ordre.
        </p>
        <p className="mt-2">
          Le contrat de prestation se forme{" "}
          <strong>directement et exclusivement entre l'Annonceur et le Prestataire</strong>. MoveSpot
          ne devient pas partie à ce contrat et n'engage pas sa responsabilité au titre de son
          exécution. MoveSpot agit en qualité d'intermédiaire technique, sans lien de subordination
          ni relation d'emploi avec le Prestataire, qui intervient en tant que professionnel
          indépendant.
        </p>
        <p className="mt-2">
          Le Prestataire est libre d'accepter ou de refuser toute demande d'Annonceur, de fixer
          ses propres tarifs et de travailler pour d'autres clients en dehors de la Plateforme.
          MoveSpot ne lui impose aucune exclusivité.
        </p>
      </LegalSection>

      {/* ── Article 2 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 2 — Statut indépendant et obligations administratives">
        <p>
          Le Prestataire déclare exercer son activité à titre indépendant, dans le respect de la
          réglementation applicable à sa situation (auto-entrepreneur, profession libérale, société,
          etc.). Il est seul responsable :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>de son immatriculation et de ses déclarations fiscales et sociales ;</li>
          <li>du paiement de ses cotisations et impôts ;</li>
          <li>de la facturation à l'Annonceur dans les formes légales requises.</li>
        </ul>
        <p className="mt-2">
          Le Prestataire garantit qu'il n'est pas lié à MoveSpot par un contrat de travail. Toute
          requalification judiciaire de la relation en contrat de travail du fait du comportement du
          Prestataire reste à la charge exclusive de ce dernier.
        </p>
      </LegalSection>

      {/* ── Article 3 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 3 — Assurance responsabilité civile professionnelle obligatoire">
        <p>
          Avant toute première mission, le Prestataire doit être titulaire d'une{" "}
          <strong>assurance Responsabilité Civile Professionnelle (RC Pro)</strong> en cours de
          validité, couvrant les dommages matériels, immatériels et corporels susceptibles d'être
          causés à des tiers dans l'exercice de son activité, y compris les dommages causés aux
          fichiers, données ou créations confiés.
        </p>
        <p className="mt-2">
          L'attestation d'assurance doit être transmise à MoveSpot avant la première mission et
          renouvelée chaque année. MoveSpot se réserve le droit de suspendre le compte du
          Prestataire en l'absence d'attestation valide.
        </p>
      </LegalSection>

      {/* ── Article 4 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 4 — Obligations spécifiques des graphistes">
        <p>
          Le Prestataire graphiste s'engage à :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            Livrer des fichiers conformes aux gabarits (templates) et spécifications techniques
            fournis par l'Annonceur ou MoveSpot (dimensions, résolution minimale 300 dpi, format
            PDF/X-4 ou AI vectoriel, profil colorimétrique CMJN) — ci-après le{" "}
            <strong>« Bon À Tirer » (BAT)</strong> ;
          </li>
          <li>
            Garantir que les créations ne contiennent aucun élément dont il ne détient pas les
            droits (typographies non-libres, photographies sous licence restrictive, marques tierces
            non autorisées) ;
          </li>
          <li>
            Respecter les délais convenus avec l'Annonceur et communiquer sans délai tout risque de
            retard ;
          </li>
          <li>
            Inclure, dans le prix convenu avec l'Annonceur, au moins{" "}
            <strong>deux (2) allers-retours de corrections</strong> ; au-delà, des frais
            supplémentaires peuvent être négociés directement entre les parties ;
          </li>
          <li>
            Conserver les fichiers sources pendant au moins douze (12) mois après la livraison
            finale, afin de pouvoir procéder à des modifications ultérieures si l'Annonceur en fait
            la demande.
          </li>
        </ul>
        <p className="mt-2">
          <strong>Validation du BAT.</strong> La livraison finale n'est réputée accomplie qu'après
          validation écrite du BAT par l'Annonceur via la Plateforme. Cette validation déclenche le
          paiement conformément à l'article 7. En l'absence de retour de l'Annonceur dans un délai
          de <strong>72 heures</strong> suivant la notification de livraison, le BAT est réputé
          tacitement accepté.
        </p>
      </LegalSection>

      {/* ── Article 5 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 5 — Obligations spécifiques des vidéastes">
        <p>
          Le Prestataire vidéaste s'engage à :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            Livrer des fichiers aux formats et résolutions convenus avec l'Annonceur (H.264/MP4,
            H.265/HEVC ou ProRes selon l'usage ; résolution minimale 1 920 × 1 080 px) ;
          </li>
          <li>
            Respecter l'ensemble de la réglementation applicable à l'utilisation de{" "}
            <strong>drones (aéronefs télépilotés)</strong>, notamment : détention du brevet de
            télépilote (arrêté du 18 mai 2018), déclaration de l'activité auprès de la DGAC,
            respect des zones de vol autorisées (SIA, Géoportail), couverture par une assurance
            drone spécifique couvrant les dommages aux tiers (art. L. 6131-1 du Code des
            transports) ;
          </li>
          <li>
            Ne pas filmer des personnes physiques identifiables sans leur consentement écrit
            préalable, ni des zones à accès réglementé (installations militaires, aéroports, zones
            Natura 2000 restreintes) ;
          </li>
          <li>
            Respecter le <strong>Code de la route</strong> lors de tout tournage impliquant des
            véhicules en circulation ; s'assurer que les prises de vue n'induisent pas de risque
            pour la sécurité routière ;
          </li>
          <li>
            Garantir que les musiques, sons et éléments graphiques intégrés dans les vidéos sont
            libres de droits ou font l'objet d'une licence appropriée pour l'usage commercial prévu.
          </li>
        </ul>
        <p className="mt-2">
          <strong>Validation de la livraison vidéo.</strong> La livraison finale n'est réputée
          accomplie qu'après validation par l'Annonceur via la Plateforme. En l'absence de retour
          dans un délai de <strong>72 heures</strong> suivant la notification, la livraison est
          réputée tacitement acceptée.
        </p>
      </LegalSection>

      {/* ── Article 6 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 6 — Cession des droits de propriété intellectuelle">
        <p>
          Dès validation de la livraison finale par l'Annonceur, le Prestataire cède à{" "}
          <strong>l'Annonceur</strong> (et non à MoveSpot) les droits de propriété intellectuelle
          sur la création livrée, dans les conditions suivantes :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>Étendue</strong> : droits d'exploitation, de reproduction, d'adaptation et de
            représentation publique à des fins publicitaires liées à la campagne MoveSpot concernée ;
          </li>
          <li>
            <strong>Territoire</strong> : monde entier ;
          </li>
          <li>
            <strong>Durée</strong> : pour toute la durée légale de protection des droits d'auteur,
            sauf durée plus courte expressément convenue entre les parties ;
          </li>
          <li>
            <strong>Droit moral</strong> : le Prestataire conserve son droit à la paternité
            (mention optionnelle de son nom). Il ne peut s'opposer aux modifications nécessaires à
            l'adaptation publicitaire de la création (recadrage, ajout d'un logo, déclinaison de
            format) dès lors que celles-ci ne dénaturent pas l'œuvre.
          </li>
        </ul>
        <p className="mt-2">
          MoveSpot se réserve uniquement un droit limité d'utilisation des aperçus et vignettes de
          la création à des fins promotionnelles de la Plateforme (portfolio, page d'exemples),
          sauf opposition expresse du Prestataire ou de l'Annonceur.
        </p>
      </LegalSection>

      {/* ── Article 7 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 7 — Rémunération et paiement via Stripe Connect">
        <p>
          La rémunération est librement fixée entre l'Annonceur et le Prestataire lors de la
          commande sur la Plateforme. MoveSpot prélève une commission d'intermédiation de{" "}
          <strong>30 % HT</strong> sur chaque transaction.
        </p>
        <p className="mt-2">
          <strong>Condition de déclenchement du paiement.</strong> Le virement au Prestataire via
          Stripe Connect est déclenché{" "}
          <strong>
            uniquement et automatiquement après validation explicite de la livraison par l'Annonceur
          </strong>{" "}
          (validation du BAT pour les graphistes, validation de la vidéo finale pour les vidéastes)
          ou après expiration du délai de 72 heures d'acceptation tacite visé aux articles 4 et 5.
          Aucun paiement n'est versé avant cette validation.
        </p>
        <p className="mt-2">
          Le Prestataire doit avoir finalisé son inscription Stripe Connect (vérification d'identité
          et IBAN valide) pour recevoir les paiements. MoveSpot ne saurait être tenue responsable
          d'un retard de paiement imputable à un onboarding Stripe incomplet.
        </p>
        <p className="mt-2">
          Le Prestataire est seul responsable de ses obligations fiscales (déclaration de chiffre
          d'affaires, TVA le cas échéant, cotisations sociales). MoveSpot ne procède à aucune
          retenue à la source.
        </p>
      </LegalSection>

      {/* ── Article 8 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 8 — Responsabilité et garantie">
        <p>
          Le Prestataire garantit à l'Annonceur que les créations livrées :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>ne contrefont aucun droit de propriété intellectuelle tiers ;</li>
          <li>
            ne contiennent aucun contenu illicite (propos discriminatoires, images pornographiques,
            incitation à la haine, etc.) ;
          </li>
          <li>
            sont techniquement conformes aux spécifications communiquées et aptes à l'impression ou
            à la diffusion publicitaire prévue.
          </li>
        </ul>
        <p className="mt-2">
          En cas de réclamation d'un tiers pour contrefaçon ou violation de droits, le Prestataire
          s'engage à prendre en charge la défense de l'Annonceur et à l'indemniser de tout préjudice
          direct résultant de la création livrée.
        </p>
        <p className="mt-2">
          MoveSpot n'est pas partie au contrat de prestation et ne peut être mise en cause pour les
          vices ou défauts des créations livrées.
        </p>
      </LegalSection>

      {/* ── Article 9 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 9 — Confidentialité et non-contournement">
        <p>
          Le Prestataire s'engage à ne pas contacter directement les Annonceurs rencontrés via la
          Plateforme à des fins commerciales extérieures à MoveSpot, pendant toute la durée de son
          inscription et durant les <strong>douze (12) mois</strong> suivant sa désinscription.
        </p>
        <p className="mt-2">
          Le Prestataire s'engage à maintenir confidentielles les informations commerciales et
          techniques dont il aura connaissance dans le cadre de ses missions.
        </p>
      </LegalSection>

      {/* ── Article 10 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 10 — Durée et résiliation">
        <p>
          Les présentes conditions s'appliquent pour une durée indéterminée à compter de
          l'inscription du Prestataire sur la Plateforme.
        </p>
        <p className="mt-2">
          Chaque partie peut mettre fin à la relation par email avec un préavis de{" "}
          <strong>quinze (15) jours</strong>. MoveSpot peut procéder à une résiliation ou
          suspension immédiate et sans indemnité en cas de : défaut d'assurance RC Pro, violation du
          présent contrat, fourniture de créations contrefaisantes ou illicites, contournement de la
          Plateforme, comportement frauduleux ou atteinte à la réputation de MoveSpot.
        </p>
      </LegalSection>

      {/* ── Article 11 ────────────────────────────────────────────────────── */}
      <LegalSection title="Article 11 — Droit applicable et litiges">
        <p>
          Les présentes conditions sont régies par le droit français. Tout litige relève de la
          compétence des tribunaux de Pointe-à-Pitre (Guadeloupe), sauf disposition légale
          impérative contraire.
        </p>
        <p className="mt-2">
          Les parties s'engagent à rechercher une solution amiable avant toute saisine
          juridictionnelle. Contact :{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
