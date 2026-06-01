import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — MoveSpot" },
      { name: "description", content: "Mentions légales de la plateforme MoveSpot : éditeur, hébergement, propriété intellectuelle et coordonnées." },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  return (
    <LegalPage eyebrow="Informations obligatoires" title="Mentions légales" updatedAt="30 mai 2026">
      <LegalSection title="Éditeur du site">
        <p>
          La plateforme MoveSpot (ci-après « le Site ») est éditée par <strong>Garry PALERME</strong>,
          entrepreneur individuel exerçant sous le nom commercial <strong>MoveSpot</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Forme juridique</strong> : Entrepreneur individuel</li>
          <li><strong>SIREN</strong> : 804 671 444</li>
          <li><strong>SIRET (établissement MoveSpot)</strong> : 804 671 444 00052</li>
          <li><strong>RCS</strong> : 804 671 444 R.C.S. Pointe-à-Pitre</li>
          <li><strong>Code APE</strong> : 47.91B — Vente à distance sur catalogue spécialisé</li>
        </ul>
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <p>
          Le directeur de la publication est <strong>Garry PALERME</strong>,
          en sa qualité d'entrepreneur individuel exploitant MoveSpot.
        </p>
      </LegalSection>

      <LegalSection title="Coordonnées">
        <p>
          <strong>Email</strong> :{" "}
          <a href="mailto:contact@notify.move-spot.com" className="text-primary hover:underline">
            contact@notify.move-spot.com
          </a>
        </p>
        <p>
          <strong>Adresse de correspondance</strong> : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
        </p>
      </LegalSection>


      <LegalSection title="Hébergeur">
        <p>
          Le Site est hébergé par <strong>Lovable GPT AB</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Adresse</strong> : Sveavägen 31, 111 34 Stockholm, Suède</li>
          <li><strong>Site web</strong> : <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="underline">https://lovable.dev</a></li>
        </ul>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          L'ensemble des éléments constituant le Site (textes, graphismes, logiciels, photographies, images,
          vidéos, sons, plans, logos, marques, etc.) est la propriété exclusive de MoveSpot ou de ses
          partenaires. Ces éléments sont protégés par le droit d'auteur, le droit des marques et tous autres
          droits de propriété intellectuelle.
        </p>
        <p>
          Toute reproduction, représentation, modification, publication, adaptation ou exploitation,
          totale ou partielle, du Site ou de l'un quelconque de ses éléments, par quelque procédé que ce soit,
          sans l'autorisation préalable et écrite de MoveSpot, est strictement interdite et constituerait une
          contrefaçon sanctionnée par les articles L.335-2 et suivants du Code de la propriété intellectuelle.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Pour toute information relative à la collecte et au traitement de vos données personnelles,
          veuillez consulter notre{" "}
          <a href="/confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>.
        </p>
        <p>
          Pour en savoir plus sur l'utilisation des cookies, veuillez consulter notre{" "}
          <a href="/cookies" className="text-primary hover:underline">Politique de cookies</a>.
        </p>
      </LegalSection>

      <LegalSection title="Crédits">
        <p>
          Conception et développement du Site : <strong>MoveSpot</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
