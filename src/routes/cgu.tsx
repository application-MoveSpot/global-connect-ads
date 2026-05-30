import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: "Conditions Générales d'Utilisation — MoveSpot" },
      { name: "description", content: "Conditions Générales d'Utilisation de la plateforme MoveSpot : règles d'accès et d'usage du service." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: CGU,
});

function CGU() {
  return (
    <LegalPage eyebrow="Mentions légales" title="Conditions Générales d'Utilisation" updatedAt="30 mai 2026">
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
          La Plateforme MoveSpot est éditée par la société MoveSpot, dont le siège social est situé en France.
          Contact : <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline">contact@notify.move-spot.com</a>.
        </p>
      </LegalSection>

      <LegalSection title="3. Accès au service">
        <p>
          La Plateforme est accessible gratuitement à tout utilisateur disposant d'un accès à Internet. Les coûts liés
          à l'accès au service (matériel, logiciels, connexion Internet) sont à la charge exclusive de l'utilisateur.
        </p>
        <p>
          MoveSpot se réserve le droit de suspendre, interrompre ou limiter l'accès à tout ou partie du service, sans
          préavis ni indemnité, notamment pour des raisons de maintenance ou de mise à jour.
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
          Sont strictement refusées toutes campagnes à caractère religieux ou de fêtes religieuses, sexistes,
          pornographiques, ou incitant à la violence sous toutes ses formes. MoveSpot se réserve le droit de refuser
          toute campagne ne respectant pas cette charte, sans avoir à se justifier.
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

      <LegalSection title="10. Droit applicable et juridiction">
        <p>
          Les présentes CGU sont régies par le droit français. Tout litige relatif à leur interprétation ou exécution
          relève de la compétence exclusive des tribunaux français.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
