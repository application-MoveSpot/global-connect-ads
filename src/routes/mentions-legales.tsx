import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — MoveSpot" },
      { name: "description", content: "Mentions légales MoveSpot : éditeur, SIRET, hébergement, services tiers (paiement, cartographie) et propriété intellectuelle." },
      { property: "og:title", content: "Mentions légales — MoveSpot" },
      { property: "og:description", content: "Éditeur, coordonnées, hébergeur et services tiers de la plateforme MoveSpot." },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/mentions-legales" }, ...hreflangLinks("/mentions-legales")],
  }),
  component: MentionsLegales,
});

function MentionsLegales() {
  const { t } = useTranslation();
  return (
    <LegalPage eyebrow={t("mentions.eyebrow")} title={t("mentions.title")} updatedAt="12 août 2026">

      <LegalSection title={t("mentions.s_editor")}>
        <p>
          La plateforme MoveSpot (ci-après « le Site ») est éditée par <strong>RAKOUN KLUB</strong>,
          entreprise individuelle.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Dénomination</strong> : RAKOUN KLUB</li>
          <li><strong>Forme juridique</strong> : Entrepreneur individuel</li>
          <li><strong>Adresse postale de l'entreprise</strong> : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault (Guadeloupe, France)</li>
          <li><strong>SIREN</strong> : 804 671 444</li>
          <li><strong>SIRET</strong> : 804 671 444 00052</li>
          <li><strong>RCS</strong> : 804 671 444 R.C.S. Pointe-à-Pitre</li>
          <li><strong>Code APE</strong> : 47.91B — Vente à distance sur catalogue spécialisé</li>
          <li><strong>TVA</strong> : TVA non applicable, article 293 B du CGI (franchise en base de TVA)</li>
        </ul>
      </LegalSection>


      <LegalSection title={t("mentions.s_director")}>
        <p>
          Le directeur de la publication est <strong>Garry PALERME</strong>,
          en sa qualité d'entrepreneur individuel exploitant MoveSpot.
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
          <strong>Adresse de correspondance</strong> : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault
        </p>
      </LegalSection>


      <LegalSection title={t("mentions.s_host")}>
        <p>
          Le Site est hébergé par <strong>Lovable GPT AB</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Adresse</strong> : Sveavägen 31, 111 34 Stockholm, Suède</li>
          <li><strong>Site web</strong> : <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="underline">https://lovable.dev</a></li>
        </ul>
      </LegalSection>

      <LegalSection title={t("mentions.s_ip")}>
        <p>
          Le nom commercial <strong>MoveSpot</strong> est exploité par RAKOUN KLUB, entreprise
          individuelle, et rattaché au SIRET mentionné ci-dessus. À ce jour, il ne fait pas l'objet
          d'un dépôt de marque auprès de l'INPI : son usage commercial est légal, mais ne confère
          pas de droit exclusif au titre du droit des marques.
        </p>
        <p>
          Les contenus éditoriaux propres au Site (textes, choix graphiques, identité visuelle,
          structure des pages) sont la propriété de RAKOUN KLUB / MoveSpot et sont protégés par
          le droit d'auteur dès leur création (article L.111-1 du Code de la propriété intellectuelle).
        </p>
        <p>
          Le Site a été conçu et développé à l'aide de la plateforme{" "}
          <a href="https://lovable.dev" target="_blank" rel="noopener noreferrer" className="underline">Lovable</a>
          {" "}et intègre des composants et bibliothèques open source tiers (notamment React, Tailwind CSS,
          shadcn/ui, TanStack) ainsi que des services tiers (cartographie, hébergement) utilisés
          conformément à leurs licences et conditions d'utilisation respectives. Les marques, logos et
          contenus appartenant à ces tiers restent la propriété de leurs détenteurs.
        </p>
        <p>
          Toute reproduction, représentation ou exploitation non autorisée des éléments propres au
          Site est interdite et constituerait une contrefaçon sanctionnée par les articles L.335-2
          et suivants du Code de la propriété intellectuelle.
        </p>
      </LegalSection>


      <LegalSection title={t("mentions.s_data")}>
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

      <LegalSection title={t("mentions.s_services")}>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Paiements</strong> : Stripe Payments Europe, Ltd. — paiements par carte, abonnements mensuels par véhicule, comptes de paiement partners (Stripe Connect) et reversements.</li>
          <li><strong>Virements bancaires</strong> : établissement bancaire de MoveSpot, pour les règlements B2B entrants et les virements SEPA sortants.</li>
          <li><strong>Cartographie et itinéraires</strong> : Mapbox — affichage des cartes, dessin des zones de diffusion, vues 3D, géocodage des adresses, calcul d'itinéraire et détection des points d'intérêt.</li>
          <li><strong>Vérification d'entreprise</strong> : API publiques françaises « Annuaire des Entreprises » / INSEE Sirene.</li>
          <li><strong>Emails transactionnels</strong> : envoi des notifications de compte et de campagne depuis le domaine <strong>move-spot.com</strong>, avec gestion des désinscriptions.</li>
          <li><strong>Infrastructure applicative</strong> : base de données, authentification (dont double authentification TOTP) et stockage de fichiers hébergés dans l'Union européenne.</li>
        </ul>

      </LegalSection>

      <LegalSection title={t("mentions.s_mediation")}>
        <p>
          Conformément à l'article L.612-1 du Code de la consommation, tout consommateur peut recourir gratuitement à
          un médiateur de la consommation en vue de la résolution amiable d'un litige. Pour toute demande, écrivez à{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">contact@move-spot.com</a>
          {" "}afin d'obtenir les coordonnées du médiateur compétent.
        </p>
      </LegalSection>

      <LegalSection title={t("mentions.s_report")}>
        <p>
          Tout contenu publicitaire diffusé via la Plateforme peut être signalé à l'adresse{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">contact@move-spot.com</a>.
          MoveSpot procède à un examen humain et peut suspendre la campagne concernée.
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
