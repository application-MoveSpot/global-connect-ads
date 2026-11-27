import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — MoveSpot" },
      {
        name: "description",
        content:
          "Mentions légales MoveSpot : éditeur, SIRET, hébergement (Lovable, Supabase), services tiers (Stripe, Resend, Brevo, Mapbox) et propriété intellectuelle.",
      },
      { property: "og:title", content: "Mentions légales — MoveSpot" },
      {
        property: "og:description",
        content: "Éditeur, coordonnées, hébergeurs et services tiers de la plateforme MoveSpot.",
      },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/mentions-legales" },
      ...hreflangLinks("/mentions-legales"),
    ],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  const { t } = useTranslation();
  return (
    <LegalPage eyebrow={t("mentions.eyebrow")} title={t("mentions.title")} updatedAt="11 novembre 2026">
      <LegalSection title={t("mentions.s_editor")}>
        <p>
          La plateforme MoveSpot (ci-après « le Site ») est éditée par{" "}
          <strong>Garry PALERME</strong>, Entrepreneur individuel (EI) — Nom commercial :{" "}
          <strong>MoveSpot</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Identité de l'éditeur</strong> : Garry PALERME, Entrepreneur individuel (EI) —
            Nom commercial : MoveSpot
          </li>
          <li>
            <strong>Forme juridique</strong> : Entrepreneur individuel
          </li>
          <li>
            <strong>Adresse postale de l'entreprise</strong> : 1 Lot, Immeuble Sud Jarry, ZAC de
            Houelbourg, 97122 Baie-Mahault (Guadeloupe, France)
          </li>
          <li>
            <strong>SIREN</strong> : 804 671 444
          </li>
          <li>
            <strong>SIRET</strong> : 804 671 444 00052
          </li>
          <li>
            <strong>Immatriculation</strong> : Immatriculée au Registre National des Entreprises
            (RNE) sous le numéro SIREN 804 671 444
          </li>
          <li>
            <strong>Code APE</strong> : 47.91B — Vente à distance sur catalogue spécialisé
          </li>
          <li>
            <strong>TVA</strong> : TVA non applicable, article 293 B du CGI (franchise en base de
            TVA)
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("mentions.s_director")}>
        <p>
          Le directeur de la publication est <strong>Garry PALERME</strong>, en sa qualité
          d'entrepreneur individuel exploitant MoveSpot.
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_contact")}>
        <p>
          <strong>Email</strong> :{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
        </p>
        <p>
          <strong>Téléphone</strong> :{" "}
          <a href="tel:+33972178087" className="text-primary hover:underline">
            09 72 17 80 87
          </a>
        </p>
        <p>
          <strong>Adresse de correspondance</strong> : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg,
          97122 Baie-Mahault
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_host")}>
        <p>
          <strong>Hébergement de l'application web (front-end)</strong> — Le Site est hébergé par{" "}
          <strong>Lovable GPT AB</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Adresse</strong> : Sveavägen 31, 111 34 Stockholm, Suède
          </li>
          <li>
            <strong>Téléphone</strong> : +46 8 501 640 00
          </li>
          <li>
            <strong>Contact</strong> :{" "}
            <a href="mailto:support@lovable.dev" className="underline">
              support@lovable.dev
            </a>
          </li>
          <li>
            <strong>Site web</strong> :{" "}
            <a
              href="https://lovable.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              https://lovable.dev
            </a>
          </li>
        </ul>

        <p className="mt-4">
          <strong>Hébergement de la base de données, de l'authentification et du stockage</strong>{" "}
          — Les données sont hébergées par <strong>Supabase Inc.</strong>
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Siège social</strong> : 970 Toa Payoh North #07-04, Singapore 318992
          </li>
          <li>
            <strong>Région de stockage des données</strong> : Union européenne (AWS eu-west-3,
            Paris, France)
          </li>
          <li>
            <strong>Site web</strong> :{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              https://supabase.com
            </a>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("mentions.s_ip")}>
        <p>
          Le nom commercial <strong>MoveSpot</strong> est exploité par Garry PALERME (EI) et
          rattaché au SIREN mentionné ci-dessus. À ce jour, il ne fait pas l'objet
          d'un dépôt de marque auprès de l'INPI : son usage commercial est légal, mais ne confère
          pas de droit exclusif au titre du droit des marques.
        </p>
        <p>
          Les contenus éditoriaux propres au Site (textes, choix graphiques, identité visuelle,
          structure des pages) sont la propriété de MoveSpot et sont protégés par le
          droit d'auteur dès leur création (article L.111-1 du Code de la propriété intellectuelle).
        </p>
        <p>
          Le Site a été conçu et développé à l'aide de la plateforme{" "}
          <a
            href="https://lovable.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Lovable
          </a>{" "}
          et intègre des composants et bibliothèques open source tiers (notamment React, Tailwind
          CSS, shadcn/ui, TanStack) ainsi que des services tiers (cartographie, hébergement)
          utilisés conformément à leurs licences et conditions d'utilisation respectives. Les
          marques, logos et contenus appartenant à ces tiers restent la propriété de leurs
          détenteurs.
        </p>
        <p>
          Toute reproduction, représentation ou exploitation non autorisée des éléments propres au
          Site est interdite et constituerait une contrefaçon sanctionnée par les articles L.335-2
          et suivants du Code de la propriété intellectuelle.
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_data")}>
        <p>
          Pour toute information relative à la collecte et au traitement de vos données
          personnelles, veuillez consulter notre{" "}
          <a href="/confidentialite" className="text-primary hover:underline">
            Politique de confidentialité
          </a>
          .
        </p>
        <p>
          Pour en savoir plus sur l'utilisation des cookies, veuillez consulter notre{" "}
          <a href="/cookies" className="text-primary hover:underline">
            Politique de cookies
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_services")}>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Paiements</strong> : Stripe Payments Europe, Ltd. — paiements par carte,
            abonnements mensuels par véhicule, comptes de paiement partenaires (Stripe Connect) et
            reversements.
          </li>
          <li>
            <strong>Virements bancaires</strong> : établissement bancaire de MoveSpot, pour les
            règlements B2B entrants et les virements SEPA sortants.
          </li>
          <li>
            <strong>Cartographie et itinéraires</strong> : Mapbox — affichage des cartes, dessin des
            zones de diffusion, vues 3D, géocodage des adresses, calcul d'itinéraire et détection
            des points d'intérêt.
          </li>
          <li>
            <strong>Vérification d'entreprise</strong> : API publiques françaises « Annuaire des
            Entreprises » / INSEE Sirene.
          </li>
          <li>
            <strong>Emails transactionnels</strong> : <strong>Resend Inc.</strong> (2261 Market
            Street, Suite 5039, San Francisco, CA 94114, États-Unis — https://resend.com) — envoi
            des notifications de compte et de campagne depuis le domaine{" "}
            <strong>notify.move-spot.com</strong>.
          </li>
          <li>
            <strong>Notifications SMS</strong> : <strong>Brevo (Sendinblue SAS)</strong> (7 rue de
            Madrid, 75008 Paris, France — https://www.brevo.com) — envoi des SMS de confirmation
            aux chauffeurs lors de la planification d'une installation publicitaire.
          </li>
          <li>
            <strong>Infrastructure applicative</strong> : <strong>Supabase Inc.</strong> — base de
            données, authentification (dont double authentification TOTP) et stockage de fichiers
            hébergés dans l'Union européenne (région AWS eu-west-3, Paris).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title={t("mentions.s_mediation")}>
        <p>
          Conformément aux articles L.612-1 et L.616-1 du Code de la consommation, MoveSpot
          adhère au service de médiation du{" "}
          <strong>
            Centre de la Médiation de la Consommation de Conciliateurs de Justice (CM2C)
          </strong>
          . Tout consommateur peut recourir gratuitement à ce médiateur en vue de la résolution
          amiable d'un litige, après avoir préalablement tenté de résoudre le différend directement
          auprès de MoveSpot.
        </p>
        <ul className="list-none space-y-1 text-sm mt-3">
          <li>
            <strong>Adresse postale :</strong> 49 Rue de Ponthieu, 75008 Paris
          </li>
          <li>
            <strong>Site &amp; formulaire de saisine :</strong>{" "}
            <a
              href="https://cm2c.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              https://cm2c.net
            </a>
          </li>
          <li>
            <strong>Email :</strong>{" "}
            <a href="mailto:cm2c@cm2c.net" className="text-primary hover:underline">
              cm2c@cm2c.net
            </a>
          </li>
        </ul>
        <p className="mt-3">
          Pour en savoir plus sur les organismes européens de règlement extrajudiciaire des litiges,
          consultez l'annuaire de la Commission européenne :{" "}
          <a
            href="https://europa.eu/youreurope/citizens/consumers/resolve-problem/alternative-dispute-resolution/index_fr.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            europa.eu
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_report")}>
        <p>
          Conformément à la <strong>loi n° 2004-575 du 21 juin 2004 (LCEN)</strong>, tout contenu
          illicite diffusé via la Plateforme (contenus haineux, pédopornographiques, apologie du
          terrorisme, contrefaçon manifeste) doit être signalé à l'adresse dédiée :
        </p>
        <p className="mt-2">
          <strong>Email LCEN :</strong>{" "}
          <a href="mailto:legal@move-spot.com" className="text-primary hover:underline">
            legal@move-spot.com
          </a>
        </p>
        <p className="mt-2">
          Les contenus publicitaires ne respectant pas la charte éditoriale de MoveSpot peuvent
          également être signalés à l'adresse générale :{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
          . MoveSpot procède à un examen humain dans les meilleurs délais et peut suspendre la
          campagne concernée.
        </p>
      </LegalSection>

      <LegalSection title="Licences open source">
        <p>
          Le Site intègre des composants et bibliothèques open source tiers, utilisés conformément
          à leurs licences respectives. Les principales licences présentes sont :
        </p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>MIT</strong> : React, Vite, TanStack Router / Query / Start, shadcn/ui,
            Tailwind CSS, Lucide React, Radix UI, react-hook-form, Zod, Sonner, date-fns, Turf.js,
            Leaflet, react-i18next.
          </li>
          <li>
            <strong>Apache 2.0</strong> : AI SDK (`ai`, `@ai-sdk/openai-compatible`).
          </li>
          <li>
            <strong>BSD-3-Clause</strong> : Mapbox GL JS.
          </li>
        </ul>
        <p className="mt-2">
          <strong>Absence de composant sous licence AGPL ou copyleft fort.</strong> Le code source
          propriétaire de MoveSpot n'intègre aucune bibliothèque soumise à la licence GNU AGPL
          (Affero General Public License) ni à toute autre licence copyleft qui imposerait la
          divulgation du code source de la Plateforme.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Les textes complets des licences sont disponibles dans les dépôts respectifs de chaque
          bibliothèque (npm / GitHub). L'utilisation de ces composants n'implique aucun transfert de
          propriété des éléments propres à MoveSpot.
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_credits")}>
        <p>
          Conception et développement du Site : <strong>MoveSpot</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
