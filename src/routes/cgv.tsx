import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions Générales de Vente — MoveSpot" },
      { name: "description", content: "Conditions Générales de Vente MoveSpot : devis cartographique, paiement par carte, portefeuille, virement bancaire B2B et reversements aux partenaires." },
      { property: "og:title", content: "Conditions Générales de Vente — MoveSpot" },
      { property: "og:description", content: "Modalités de commande, de paiement et d'annulation des campagnes de publicité mobile MoveSpot." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/cgv" }],
  }),
  component: CGV,
});

function CGV() {
  return (
    <LegalPage eyebrow="Mentions légales" title="Conditions Générales de Vente" updatedAt="11 août 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes Conditions Générales de Vente (« CGV ») régissent les relations contractuelles entre MoveSpot
          et tout client (ci-après « l'Annonceur ») souhaitant diffuser une campagne de publicité mobile sur les
          véhicules référencés sur la Plateforme.
        </p>
      </LegalSection>

      <LegalSection title="2. Description des services">
        <p>
          MoveSpot est une marketplace de publicité mobile : elle met en relation des annonceurs avec des
          propriétaires de véhicules, des chauffeurs et des prestataires certifiés (pose de covering, production
          vidéo, création graphique). Chaque campagne est définie par une zone géographique, une période de diffusion,
          un type de véhicule et un budget.
        </p>
        <p>
          La diffusion est mesurée par géolocalisation : distance parcourue, minutes actives et part du trajet
          réalisée dans la zone de ciblage sont restituées à l'annonceur dans son tableau de suivi.
        </p>
      </LegalSection>

      <LegalSection title="3. Commande et devis">
        <p>
          L'Annonceur crée un brief depuis son espace, dessine sa zone de diffusion sur la carte et obtient un
          récapitulatif de devis. La commande est validée par l'acceptation de ce devis puis par le règlement.
          Toute commande implique l'acceptation sans réserve des présentes CGV.
        </p>
        <p>
          La validation définitive de la campagne intervient après contrôle du contenu publicitaire par MoveSpot,
          dans un délai indicatif de 24 heures ouvrées.
        </p>
      </LegalSection>

      <LegalSection title="4. Tarifs et taxes">
        <p>
          Le budget est calculé automatiquement à partir de la surface réelle de la zone dessinée : 1,80 € par km² et
          par jour, porté à 2,70 € par km² et par jour (coefficient de densité 1,5×) dans les grandes agglomérations.
          Un montant plancher de 10 € s'applique par campagne.
        </p>
        <p>
          Les prix de nos services sont indiqués en euros hors taxes (HT). La TVA applicable est ajoutée lors de la
          facturation selon les règles de territorialité en vigueur :
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Guadeloupe &amp; DOM (Martinique, Réunion)</strong> : le taux de TVA local de 8,5 % est appliqué à
            la facturation.
          </li>
          <li>
            <strong>France métropolitaine</strong> : prestation exonérée de TVA (art. 259 B du CGI). La facture porte la
            mention « TVA non applicable — art. 259 B du CGI ».
          </li>
          <li>
            <strong>Union européenne (hors France)</strong> : facturation hors taxes. L'Annonceur professionnel est
            redevable de la TVA dans son pays (mécanisme de l'autoliquidation). La facture porte la mention
            « Autoliquidation — art. 196 de la Directive 2006/112/CE ».
          </li>
          <li>
            <strong>Reste du monde (hors UE)</strong> : prestation exonérée de TVA (art. 259 B du CGI). La facture porte
            la mention « Exonération de TVA — article 259 B du CGI ».
          </li>
        </ul>

      </LegalSection>


      <LegalSection title="5. Modalités de paiement">
        <p>Trois modes de règlement sont proposés :</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Carte bancaire (et moyens équivalents)</strong> via notre prestataire de paiement Stripe, en
            paiement unique ou par abonnement. Certaines campagnes peuvent être proposées avec une période d'essai
            gratuite de 14 jours, à l'issue de laquelle l'abonnement est automatiquement facturé sauf résiliation
            avant son terme.
          </li>
          <li>
            <strong>Portefeuille MoveSpot</strong> : l'Annonceur approvisionne un solde prépayé et l'utilise pour
            régler ses campagnes. Le solde est utilisable sur la Plateforme et n'est pas rémunéré.
          </li>
          <li>
            <strong>Virement bancaire</strong>, réservé aux budgets professionnels (B2B). La demande est instruite par
            MoveSpot, qui communique les coordonnées bancaires et une référence de paiement ; la campagne est activée
            après constatation effective de l'encaissement.
          </li>
        </ul>
        <p>
          Aucune diffusion n'est engagée avant réception complète du paiement ou, dans le cas d'un essai, avant
          l'enregistrement d'un moyen de paiement valide.
        </p>
      </LegalSection>

      <LegalSection title="6. Commission et reversements">
        <p>
          MoveSpot prélève une commission d'intermédiation de 30 % du montant hors taxes. Les 70 % restants sont
          répartis entre le propriétaire du véhicule, le chauffeur et, le cas échéant, le prestataire de pose. Les
          reversements sont effectués vers les comptes de paiement des bénéficiaires (Stripe Connect Express) ou par
          virement SEPA, après validation des métriques de campagne et finalisation de leur vérification d'identité et
          de leur IBAN.
        </p>
      </LegalSection>

      <LegalSection title="7. Validation du contenu et de la pose">
        <p>
          Conformément à la charte de contenu de MoveSpot, sont refusées toutes campagnes à caractère religieux ou de
          fêtes religieuses, politique ou électoral, sexistes, pornographiques, ou incitant à la violence, ainsi que
          les messages privés à caractère célébratoire individuel. En cas de refus, l'Annonceur en est informé par
          email et peut soumettre un nouveau contenu, sans frais supplémentaires.
        </p>
        <p>
          La pose du support sur le véhicule fait l'objet d'un contrôle sur la base de quatre photographies (avant,
          côtés, arrière) transmises via la Plateforme. La diffusion facturable ne démarre qu'après approbation de la
          pose.
        </p>
      </LegalSection>

      <LegalSection title="8. Annulation et remboursement">
        <p>
          L'Annonceur peut annuler sa commande sans frais jusqu'à 72 heures avant la date de diffusion prévue. Passé
          ce délai, 50 % du montant total reste dû. Aucun remboursement n'est possible une fois la diffusion
          commencée, sauf défaillance technique imputable à MoveSpot. En cas d'annulation avant diffusion, le montant
          peut, au choix de l'Annonceur, être recrédité sur son portefeuille MoveSpot ou remboursé selon le moyen de
          paiement d'origine.
        </p>
      </LegalSection>

      <LegalSection title="9. Responsabilité de l'Annonceur">
        <p>
          L'Annonceur garantit qu'il détient l'ensemble des droits nécessaires sur les éléments fournis (images,
          textes, marques, vidéos) et qu'il respecte la législation applicable en matière de publicité. Il garantit
          MoveSpot contre tout recours de tiers lié à sa campagne.
        </p>
      </LegalSection>

      <LegalSection title="10. Responsabilité de MoveSpot">
        <p>
          MoveSpot agit en qualité d'intermédiaire et met en œuvre tous les moyens raisonnables pour assurer la bonne
          exécution des campagnes. Sa responsabilité est limitée au montant effectivement payé par l'Annonceur pour la
          campagne concernée. MoveSpot n'est pas responsable de l'état des véhicules, de la qualité de pose réalisée
          par un prestataire indépendant, ni des indisponibilités liées à des cas de force majeure.
        </p>
      </LegalSection>

      <LegalSection title="11. Données personnelles">
        <p>
          Les données collectées dans le cadre de la commande sont traitées conformément à notre
          <a href="/confidentialite" className="text-primary hover:underline"> Politique de confidentialité</a>.
        </p>
      </LegalSection>

      <LegalSection title="12. Droit applicable et litiges">
        <p>
          Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, tout litige sera porté
          devant les tribunaux compétents du ressort du siège de MoveSpot.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
