import { createFileRoute } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { LegalPage, LegalSection } from "@/components/app/LegalPage";

export const Route = createFileRoute("/_public/confidentialite")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — MoveSpot" },
      {
        name: "description",
        content:
          "Politique de confidentialité MoveSpot : données collectées, finalités, durées de conservation, droits RGPD, sous-traitants et sécurité.",
      },
      { property: "og:title", content: "Politique de confidentialité — MoveSpot" },
      { name: "robots", content: "index, follow" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/confidentialite" },
      ...hreflangLinks("/confidentialite"),
    ],
  }),

  component: Confidentialite,
});

function Confidentialite() {
  return (
    <LegalPage
      eyebrow="RGPD"
      title="Politique de confidentialité"
      updatedAt="27 novembre 2026"
    >
      <LegalSection title="1 — Responsable du traitement">
        <p>
          Le responsable du traitement des données personnelles collectées via la plateforme
          MoveSpot est :
        </p>
        <p className="mt-2">
          <strong>Garry PALERME</strong>, Entrepreneur Individuel (EI) — Nom commercial :{" "}
          <strong>MoveSpot</strong>
          <br />
          SIREN : 804 671 444 (R.C.S. Pointe-à-Pitre)
          <br />
          Adresse : 1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, Guadeloupe
          (France)
          <br />
          Contact DPO :{" "}
          <a href="mailto:privacy@move-spot.com" className="text-primary hover:underline">
            privacy@move-spot.com
          </a>{" "}
          ou{" "}
          <a href="mailto:contact@move-spot.com" className="text-primary hover:underline">
            contact@move-spot.com
          </a>
        </p>
      </LegalSection>

      <LegalSection title="2 — Données collectées et finalités">
        <p>MoveSpot collecte uniquement les données strictement nécessaires au fonctionnement du service :</p>
        <ul className="list-disc pl-6 space-y-2 mt-2">
          <li>
            <strong>Identité et coordonnées</strong> (nom, prénom, email, téléphone) — gestion du
            compte, facturation, notifications de service.
          </li>
          <li>
            <strong>Données professionnelles</strong> (SIRET, RCS, numéro de TVA) — vérification
            d'identité, obligations légales (DAC7, Art. 242 bis CGI).
          </li>
          <li>
            <strong>Données de paiement</strong> — traitées exclusivement par Stripe Inc. ;
            MoveSpot ne stocke aucun numéro de carte bancaire.
          </li>
          <li>
            <strong>Données de géolocalisation</strong> — relevées ponctuellement lors de l'envoi
            de photos de pose/dépose pour horodater et géolocaliser la preuve d'intervention.
            Collectées en continu (en arrière-plan) pendant les heures de conduite actives des
            chauffeurs, exclusivement pour le calcul des métriques de campagne.
          </li>
          <li>
            <strong>Photos de véhicules</strong> — preuve de pose du covering, archivées pendant
            la durée de la campagne + 30 jours.
          </li>
          <li>
            <strong>Données de navigation</strong> — cookies fonctionnels (session) et, avec
            consentement explicite, pixels de mesure d'audience (Meta Pixel, Google Ads).
          </li>
          <li>
            <strong>Consentements</strong> — date et version des CGU et de la présente politique
            acceptées, ainsi que l'éventuel consentement marketing, enregistrés pour prouver la
            conformité RGPD.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3 — Bases légales">
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Exécution du contrat</strong> — données nécessaires à la fourniture du service
            (compte, paiements, géolocalisation des campagnes).
          </li>
          <li>
            <strong>Obligation légale</strong> — données fiscales (DAC7), conservation des
            justificatifs comptables.
          </li>
          <li>
            <strong>Intérêt légitime</strong> — sécurité de la plateforme, lutte contre la fraude,
            amélioration du service.
          </li>
          <li>
            <strong>Consentement</strong> — cookies analytics/retargeting, communications
            marketing optionnelles.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4 — Durées de conservation">
        <ul className="list-disc pl-6 space-y-2">
          <li>Données de compte actif : pendant toute la durée de la relation contractuelle.</li>
          <li>
            Après suppression du compte : 3 ans pour les données nécessaires à la défense en cas
            de litige ; 10 ans pour les pièces comptables.
          </li>
          <li>Données de géolocalisation agrégées (métriques) : 5 ans.</li>
          <li>Photos de pose/dépose : durée de la campagne + 30 jours.</li>
          <li>Logs de connexion : 1 an (obligation légale LCEN).</li>
        </ul>
      </LegalSection>

      <LegalSection title="5 — Intelligence artificielle — non-utilisation pour l'entraînement">
        <p>
          <strong>
            MoveSpot n'utilise aucune donnée personnelle de ses utilisateurs pour entraîner des
            modèles d'intelligence artificielle, sans autorisation explicite préalable.
          </strong>
        </p>
        <p className="mt-2">
          Les fonctionnalités IA de la plateforme — validation assistée de photos (détection de
          covering), chatbot FAQ, suggestions de profil à l'inscription — utilisent des modèles
          tiers déjà entraînés (OpenAI GPT-4o, vision models), auxquels les données sont
          transmises uniquement pour traiter la requête en cours. Ces données ne sont pas
          conservées par le prestataire IA à des fins d'entraînement, conformément aux conditions
          d'utilisation applicables (OpenAI API Data Usage Policy, Zero Data Retention pour les
          appels API).
        </p>
        <p className="mt-2">
          Toute évolution de cette politique vers un usage des données à des fins d'entraînement
          fera l'objet d'une information préalable et nécessitera un consentement explicite
          distinct.
        </p>
      </LegalSection>

      <LegalSection title="6 — Sous-traitants (liste des processeurs de données)">
        <p>
          Conformément à l'article 28 du RGPD, MoveSpot fait appel aux sous-traitants suivants,
          liés par un contrat de traitement des données (DPA) ou des clauses contractuelles types
          (CCT) approuvées par la Commission européenne :
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold">Sous-traitant</th>
                <th className="text-left py-2 pr-4 font-semibold">Rôle</th>
                <th className="text-left py-2 pr-4 font-semibold">Pays / Transfert</th>
                <th className="text-left py-2 font-semibold">DPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <tr>
                <td className="py-2 pr-4 font-medium">Supabase Inc.</td>
                <td className="py-2 pr-4">Base de données, Auth, Stockage</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Stripe Inc.</td>
                <td className="py-2 pr-4">Paiements, Stripe Connect</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Cloudflare Inc.</td>
                <td className="py-2 pr-4">Hébergement Workers, CDN, Edge</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Lovable AB</td>
                <td className="py-2 pr-4">Développement &amp; déploiement</td>
                <td className="py-2 pr-4">Suède (UE)</td>
                <td className="py-2">En cours</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">OpenAI LLC</td>
                <td className="py-2 pr-4">IA — validation photos, chatbot FAQ</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Resend Inc.</td>
                <td className="py-2 pr-4">Emails transactionnels</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Mapbox Inc.</td>
                <td className="py-2 pr-4">Cartographie, géocodage</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Meta Platforms</td>
                <td className="py-2 pr-4">Pixel retargeting (avec consentement)</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-medium">Google LLC</td>
                <td className="py-2 pr-4">Pixel Google Ads (avec consentement)</td>
                <td className="py-2 pr-4">USA — CCT (SCC)</td>
                <td className="py-2">Oui</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm">
          CCT = Clauses Contractuelles Types (Standard Contractual Clauses), mécanisme de transfert
          approuvé par la Commission européenne conformément à la décision d'adéquation 2021/914/UE.
        </p>
      </LegalSection>

      <LegalSection title="7 — Droits des personnes concernées">
        <p>Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :</p>
        <ul className="list-disc pl-6 space-y-1.5 mt-2">
          <li>
            <strong>Accès</strong> (art. 15) — obtenir une copie de vos données personnelles.
          </li>
          <li>
            <strong>Rectification</strong> (art. 16) — corriger des données inexactes.
          </li>
          <li>
            <strong>Effacement</strong> (art. 17) — « droit à l'oubli » ; exercez-le via la page{" "}
            <a href="/parametres" className="text-primary hover:underline">
              Paramètres → Supprimer mon compte
            </a>
            .
          </li>
          <li>
            <strong>Portabilité</strong> (art. 20) — télécharger vos données en JSON via la page{" "}
            <a href="/parametres" className="text-primary hover:underline">
              Paramètres → Télécharger mes données
            </a>
            .
          </li>
          <li>
            <strong>Limitation</strong> (art. 18) et <strong>Opposition</strong> (art. 21) —
            notamment au traitement de vos données à des fins de marketing.
          </li>
          <li>
            <strong>Retrait du consentement</strong> — à tout moment pour les cookies analytics et
            les communications marketing, sans effet rétroactif.
          </li>
        </ul>
        <p className="mt-3">
          Pour exercer ces droits, contactez :{" "}
          <a href="mailto:privacy@move-spot.com" className="text-primary hover:underline">
            privacy@move-spot.com
          </a>
          . Réponse sous 30 jours. En cas de réponse insatisfaisante, vous pouvez saisir la{" "}
          <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) :{" "}
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            www.cnil.fr
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8 — Sécurité et notification de violation (Art. 33-34 RGPD)">
        <p>
          MoveSpot met en œuvre des mesures techniques et organisationnelles appropriées pour
          protéger vos données contre la perte, l'accès non autorisé, la divulgation ou
          l'altération :
        </p>
        <ul className="list-disc pl-6 space-y-1.5 mt-2">
          <li>Chiffrement en transit (TLS 1.3) et au repos (AES-256).</li>
          <li>Authentification à deux facteurs (TOTP) disponible pour tous les comptes.</li>
          <li>Accès aux données restreint au personnel habilité (principe du moindre privilège).</li>
          <li>Row Level Security (RLS) Supabase — chaque utilisateur ne peut accéder qu'à ses données.</li>
          <li>
            Principe de <strong>Privacy by Design</strong> : les nouvelles fonctionnalités sont
            conçues dès le départ en intégrant la protection des données.
          </li>
        </ul>
        <p className="mt-3">
          <strong>Notification en cas de violation de données personnelles (Art. 33-34 RGPD) :</strong>
        </p>
        <ul className="list-disc pl-6 space-y-1.5 mt-1">
          <li>
            En cas de violation susceptible d'engendrer un risque pour les droits et libertés des
            personnes, MoveSpot notifiera la <strong>CNIL dans un délai de 72 heures</strong>{" "}
            (Art. 33 RGPD).
          </li>
          <li>
            Si la violation est susceptible d'engendrer un risque élevé pour les personnes
            concernées, celles-ci en seront informées <strong>sans délai injustifié</strong>{" "}
            (Art. 34 RGPD), par email à l'adresse de leur compte MoveSpot.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9 — Cookies et traceurs">
        <p>
          Les cookies strictement nécessaires (session, authentification) sont déposés sans
          consentement préalable, sur la base de l'intérêt légitime et de l'exécution du contrat.
        </p>
        <p className="mt-2">
          Les cookies de mesure d'audience et de retargeting (Meta Pixel, Google Ads) ne sont
          chargés qu'après votre acceptation explicite via le bandeau de consentement, qui propose
          un bouton <strong>Refuser</strong> au même niveau visuel que le bouton Accepter.
        </p>
        <p className="mt-2">
          Vous pouvez modifier votre choix à tout moment en cliquant sur « Gérer les cookies »
          dans le pied de page.
        </p>
      </LegalSection>

      <LegalSection title="10 — Modifications">
        <p>
          La présente politique peut être mise à jour. La version en vigueur est toujours
          accessible à l'adresse{" "}
          <a href="/confidentialite" className="text-primary hover:underline">
            move-spot.com/confidentialite
          </a>
          . En cas de modification substantielle, les utilisateurs seront informés par email.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
