/**
 * SEO.tsx — Utilitaire de gestion des balises meta pour TanStack Router
 *
 * La stack MoveSpot utilise TanStack Start avec le SSR natif : les balises
 * <head> sont injectées côté serveur via la fonction `head()` de chaque route,
 * pas via un composant React (react-helmet serait client-only et incompatible
 * avec le SSR de TanStack Start).
 *
 * Usage dans un fichier de route :
 *   import { buildSeoHead } from "@/components/SEO";
 *   export const Route = createFileRoute("/ma-page")({
 *     head: () => buildSeoHead({ title: "...", description: "...", path: "/ma-page" }),
 *   });
 */

import { hreflangLinks } from "@/lib/seo";

export const BASE_URL   = "https://move-spot.com";
export const DEFAULT_OG  = `${BASE_URL}/og-image.png`;
export const TWITTER_HANDLE = "@movespot_pub";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SeoConfig {
  /** Titre de la page — idéalement 50-60 caractères */
  title: string;
  /** Description — tronquée automatiquement à 155 caractères */
  description: string;
  /** Chemin relatif, ex. "/", "/tarifs", "/devenir-partenaire" */
  path: string;
  /** URL absolue de l'image OG (1200×630). Par défaut : og-image.png */
  ogImage?: string;
  /** Type OG — "website" par défaut */
  ogType?: "website" | "article";
  /** Empêche l'indexation (pages privées, auth, etc.) */
  noIndex?: boolean;
  /** Un ou plusieurs objets JSON-LD Schema.org */
  jsonLd?: unknown | unknown[];
  /** Désactive la génération automatique des liens hreflang */
  noHreflang?: boolean;
}

// ── Fonction principale ───────────────────────────────────────────────────────

/**
 * Génère le retour compatible avec `head()` de TanStack Router.
 * Inclut : title, description, canonical, Open Graph, Twitter Cards, JSON-LD.
 */
export function buildSeoHead(config: SeoConfig) {
  const {
    title,
    description: rawDesc,
    path,
    ogImage   = DEFAULT_OG,
    ogType    = "website",
    noIndex   = false,
    jsonLd,
    noHreflang = false,
  } = config;

  // Enforce 155-char description limit
  const description = rawDesc.length > 155 ? `${rawDesc.slice(0, 152)}…` : rawDesc;
  const canonical   = `${BASE_URL}${path}`;

  const meta = [
    { title },
    { name: "description",        content: description },
    ...(noIndex ? [{ name: "robots", content: "noindex,nofollow" }] : []),

    // ── Open Graph ──────────────────────────────────────────────────────────
    { property: "og:title",        content: title },
    { property: "og:description",  content: description },
    { property: "og:url",          content: canonical },
    { property: "og:type",         content: ogType },
    { property: "og:image",        content: ogImage },
    { property: "og:image:width",  content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt",    content: title },

    // ── Twitter Cards ───────────────────────────────────────────────────────
    { name: "twitter:card",        content: "summary_large_image" },
    { name: "twitter:site",        content: TWITTER_HANDLE },
    { name: "twitter:title",       content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image",       content: ogImage },
    { name: "twitter:image:alt",   content: title },
  ];

  const links = [
    { rel: "canonical", href: canonical },
    ...(noHreflang ? [] : hreflangLinks(path)),
  ];

  const scripts = jsonLd
    ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      }))
    : [];

  return { meta, links, scripts };
}

// ── Helpers JSON-LD réutilisables ────────────────────────────────────────────

/** FAQ dédiée aux annonceurs — injectée sur la page d'accueil */
export const FAQ_ADVERTISERS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Comment est calculé le prix d'une campagne de publicité mobile ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le prix se calcule automatiquement selon la surface de votre zone (en km²), la densité urbaine et la durée. Tarif plancher : 1,80 €/km²/jour (2,70 € en grande agglomération). Vous dessinez votre polygone sur la carte interactive et le budget s'affiche instantanément — sans engagement, sans minimum de durée.",
      },
    },
    {
      "@type": "Question",
      name: "Comment MoveSpot suit-il les campagnes publicitaires en temps réel ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Chaque véhicule partner envoie sa position GPS toutes les 30 secondes. MoveSpot calcule les kilomètres réellement parcourus dans votre zone, les impressions estimées par densité de population, et vous génère un rapport mensuel en PDF téléchargeable depuis votre espace annonceur. Zéro estimation approximative — 100 % de données certifiées GPS.",
      },
    },
    {
      "@type": "Question",
      name: "Quelle est la différence entre la publicité mobile MoveSpot et un panneau publicitaire classique ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Contrairement aux panneaux fixes, la publicité sur véhicule (street-marketing mobile) circule là où se trouvent vos clients. Vous lancez une campagne en 5 minutes (vs 3 à 6 semaines en agence traditionnelle), avec un budget dès 25 €/jour, sans engagement, et avec une mesure d'audience GPS certifiée. MoveSpot connecte directement annonceurs et propriétaires de flottes — aucun intermédiaire.",
      },
    },
  ],
};

/** FAQ dédiée aux propriétaires de véhicules */
export const FAQ_OWNERS_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Combien puis-je gagner par mois avec MoveSpot ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Le minimum garanti est de 17,50 € par véhicule et par jour actif (= 70 % du tarif plancher advertiser de 25 €). Avec 15 jours actifs par mois, c'est au moins 262 € de revenu complémentaire net. En zone dense (Paris, Lyon, Marseille), les revenus peuvent atteindre 49 €/jour.",
      },
    },
    {
      "@type": "Question",
      name: "Quels véhicules sont acceptés pour la publicité mobile ?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Food trucks, vans utilitaires, taxis, VTC, scooters de livraison, voitures particulières et flottes d'entreprise. Le véhicule doit être en état de circuler et disposer d'une surface utilisable pour l'affichage. La validation inclut 4 photos et prend 48 heures.",
      },
    },
  ],
};
