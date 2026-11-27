import { createFileRoute } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/_public/mentions-legales")({
  head: () => ({
    meta: [
      { title: "Mentions légales — MoveSpot" },
      {
        name: "description",
        content:
          "Mentions légales MoveSpot : éditeur, hébergeur, propriété intellectuelle, licences open source, signalement de contenus.",
      },
      { property: "og:title", content: "Mentions légales — MoveSpot" },
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
  return (
    <LegalPage
      eyebrow="Légal"
      title="Mentions légales"
      updatedAt="27 novembre 2026"
    >
      <LegalSection title="1 — Éditeur du site">
        <p>
          Le site <strong>move-spot.com</strong> est édité par :
        </p>
        <p className="mt-2">
          <strong>Garry PALERME</strong>
          <br />
          Entrepreneur Individuel (EI) — Nom commercial : <strong>MoveSpot</strong>
          <br />
          SIREN : 804 671 444
          <br />
          R.C.S. Pointe-à-Pitre
          <br />
          Adresse : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe
          (France)
          <br />
          Téléphone :{" "}
          <a href="tel:+33972178087" className="text-primary hover:underline">
            09 72 17 80 87
          </a>
          <br />
          Email :{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
        </p>
        <p className="mt-2">
          Directeur de la publication : <strong>Garry PALERME</strong>
        </p>
      </LegalSection>

      <LegalSection title="2 — Hébergeur">
        <p>
          Le site est hébergé par :
        </p>
        <p className="mt-2">
          <strong>Cloudflare, Inc.</strong>
          <br />
          101 Townsend St, San Francisco, CA 94107, États-Unis
          <br />
          <a
            href="https://www.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            www.cloudflare.com
          </a>
        </p>
        <p className="mt-2">
          Les données sont également stockées chez <strong>Supabase Inc.</strong> (base de
          données) et <strong>Lovable AB</strong> (plateforme de déploiement).
        </p>
      </LegalSection>

      <LegalSection title="3 — Propriété intellectuelle">
        <p>
          L'ensemble des éléments constituant le site move-spot.com (textes, graphismes, logos,
          icônes, images, vidéos, données, structure et code source) sont la propriété exclusive
          de <strong>Garry PALERME / MoveSpot</strong>, sauf mention contraire.
        </p>
        <p className="mt-2">
          Toute reproduction, représentation, modification, publication, transmission ou
          dénaturation, totale ou partielle, du site ou de son contenu, par quelque procédé que ce
          soit, est interdite sans l'autorisation écrite préalable de MoveSpot.
        </p>
      </LegalSection>

      <LegalSection title="4 — Licences open source">
        <p>
          Le site MoveSpot utilise des composants logiciels open source. Aucune dépendance de
          licence AGPL (Affero General Public License) n'est présente dans le projet. Les
          principales licences utilisées sont :
        </p>
        <ul className="list-disc pl-6 space-y-1.5 mt-2">
          <li>
            <strong>MIT</strong> — React, TanStack Router/Query/Start, Vite, Tailwind CSS,
            Radix UI, shadcn/ui, Zod, React Hook Form, Lucide React, Sonner, et la majorité des
            dépendances.
          </li>
          <li>
            <strong>Apache 2.0</strong> — Certains outils de build et utilitaires.
          </li>
          <li>
            <strong>BSD</strong> — Quelques bibliothèques de géolocalisation et de cartographie.
          </li>
        </ul>
        <p className="mt-2">
          Le texte complet de ces licences est disponible dans les répertoires{" "}
          <code>node_modules</code> de chaque dépendance, ou sur{" "}
          <a
            href="https://opensource.org/licenses"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            opensource.org
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="5 — Signalement de contenus illicites (LCEN)">
        <p>
          Conformément à l'article 6-I-5 de la loi n° 2004-575 du 21 juin 2004 pour la Confiance
          dans l'Économie Numérique (LCEN), toute personne peut signaler à MoveSpot des contenus
          illicites hébergés sur la plateforme.
        </p>
        <p className="mt-2">
          <strong>Procédure de signalement :</strong>
        </p>
        <ul className="list-disc pl-6 space-y-1.5 mt-1">
          <li>
            Par email à :{" "}
            <a href="mailto:legal@move-spot.com" className="text-primary hover:underline">
              legal@move-spot.com
            </a>{" "}
            (ou{" "}
            <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
              contact@move-spot.com
            </a>
            )
          </li>
          <li>
            En précisant : (i) vos coordonnées, (ii) la description du contenu litigieux et son
            URL, (iii) les motifs pour lesquels le contenu doit être retiré (qualification légale
            des faits).
          </li>
        </ul>
        <p className="mt-2">
          MoveSpot traitera les signalements conformes dans les plus brefs délais. Conformément à
          l'article 6-I-5 de la LCEN, le signalement abusif ou de mauvaise foi est passible de
          sanctions pénales (art. 226-10 du Code pénal — dénonciation calomnieuse).
        </p>
        <p className="mt-2">
          Pour signaler une violation de droits d'auteur, veuillez également contacter :{" "}
          <a href="mailto:legal@move-spot.com" className="text-primary hover:underline">
            legal@move-spot.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="6 — Liens hypertextes">
        <p>
          Le site move-spot.com peut contenir des liens vers des sites tiers. MoveSpot n'exerce
          aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.
        </p>
        <p className="mt-2">
          La création de liens pointant vers move-spot.com est autorisée sous réserve qu'elle ne
          soit pas trompeuse, qu'elle ne porte pas atteinte à l'image de MoveSpot et qu'elle ne
          soit pas utilisée à des fins commerciales sans accord préalable.
        </p>
      </LegalSection>

      <LegalSection title="7 — Droit applicable">
        <p>
          Les présentes mentions légales sont régies par le <strong>droit français</strong>. En
          cas de litige, les tribunaux français sont seuls compétents.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
