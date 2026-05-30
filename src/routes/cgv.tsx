import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/cgv")({
  head: () => ({
    meta: [
      { title: "Conditions Générales de Vente — MoveSpot" },
      { name: "description", content: "Conditions Générales de Vente MoveSpot : modalités de réservation et de paiement des emplacements publicitaires." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: CGV,
});

function CGV() {
  return (
    <LegalPage eyebrow="Mentions légales" title="Conditions Générales de Vente" updatedAt="30 mai 2026">
      <LegalSection title="1. Objet">
        <p>
          Les présentes Conditions Générales de Vente (« CGV ») régissent les relations contractuelles entre la
          société MoveSpot et tout client (ci-après « l'Annonceur ») souhaitant réserver un ou plusieurs emplacements
          publicitaires sur les hubs de mobilité référencés sur la Plateforme.
        </p>
      </LegalSection>

      <LegalSection title="2. Description des services">
        <p>
          MoveSpot propose la commercialisation d'emplacements publicitaires physiques et numériques au sein de hubs
          de mobilité internationaux (stations de vélos, scooters, automobiles partagées). Chaque emplacement est
          décrit avec son format, sa localisation, son volume d'impressions estimé et son tarif journalier.
        </p>
      </LegalSection>

      <LegalSection title="3. Commande">
        <p>
          La commande s'effectue via le formulaire de réservation disponible sur la Plateforme. Toute commande
          implique l'acceptation sans réserve des présentes CGV. L'Annonceur recevra une confirmation de demande à
          l'adresse email renseignée. La validation définitive intervient après vérification du contenu publicitaire
          par MoveSpot, dans un délai de 24 heures ouvrées.
        </p>
      </LegalSection>

      <LegalSection title="4. Prix et modalités de paiement">
        <p>
          Les prix sont indiqués en euros, hors taxes, et s'entendent par jour de diffusion et par emplacement. La
          TVA applicable au jour de la commande est ajoutée lors de la facturation.
        </p>
        <p>
          Le paiement s'effectue à la confirmation de la campagne, par carte bancaire ou virement. Aucune diffusion
          ne sera engagée avant réception complète du paiement.
        </p>
      </LegalSection>

      <LegalSection title="5. Validation du contenu publicitaire">
        <p>
          Conformément à la charte de contenu de MoveSpot, sont refusées toutes campagnes à caractère religieux ou
          de fêtes religieuses, sexistes, pornographiques, ou incitant à la violence. En cas de refus, l'Annonceur en
          est informé par email et peut soumettre un nouveau contenu, sans frais supplémentaires.
        </p>
        <p>
          MoveSpot conserve un pouvoir discrétionnaire d'appréciation et peut refuser toute campagne sans avoir à
          motiver sa décision au-delà de la charte.
        </p>
      </LegalSection>

      <LegalSection title="6. Annulation et remboursement">
        <p>
          L'Annonceur peut annuler sa commande sans frais jusqu'à 72 heures avant la date de diffusion prévue.
          Passé ce délai, 50 % du montant total reste dû. Aucun remboursement n'est possible une fois la diffusion
          commencée, sauf défaillance technique imputable à MoveSpot.
        </p>
      </LegalSection>

      <LegalSection title="7. Responsabilité de l'Annonceur">
        <p>
          L'Annonceur garantit qu'il détient l'ensemble des droits nécessaires sur les éléments fournis (images,
          textes, marques) et qu'il respecte la législation applicable en matière de publicité. Il garantit MoveSpot
          contre tout recours de tiers lié à sa campagne.
        </p>
      </LegalSection>

      <LegalSection title="8. Responsabilité de MoveSpot">
        <p>
          MoveSpot s'engage à mettre en œuvre tous les moyens raisonnables pour assurer la bonne diffusion des
          campagnes. Sa responsabilité est limitée au montant effectivement payé par l'Annonceur pour la campagne
          concernée. MoveSpot ne saurait être tenue responsable des indisponibilités liées à des cas de force majeure.
        </p>
      </LegalSection>

      <LegalSection title="9. Données personnelles">
        <p>
          Les données collectées dans le cadre de la commande sont traitées conformément à notre
          <a href="/confidentialite" className="text-primary hover:underline"> Politique de confidentialité</a>.
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable et litiges">
        <p>
          Les présentes CGV sont soumises au droit français. À défaut de résolution amiable, tout litige sera porté
          devant les tribunaux compétents du ressort du siège social de MoveSpot.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
