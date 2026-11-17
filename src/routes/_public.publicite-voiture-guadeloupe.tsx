import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/components/SEO";
import { LocalLandingPage, type LocalPageConfig } from "@/components/shared/LocalLandingPage";

const CONFIG: LocalPageConfig = {
  city: "Guadeloupe",
  cityShort: "Guadeloupe",
  zones: ["Baie-Mahault", "Pointe-à-Pitre", "Les Abymes", "Le Gosier", "Jarry", "Capesterre-Belle-Eau", "Sainte-Anne"],
  highlights: [
    {
      icon: "🚕",
      title: "Taxis et VTC omniprésents",
      desc: "Les taxis collectifs et VTC guadeloupéens sont le principal moyen de transport inter-villes — un support publicitaire naturellement mobile et visible.",
    },
    {
      icon: "🏙️",
      title: "Zone Jarry & Baie-Mahault",
      desc: "Le bassin commercial de Jarry concentre flux logistiques, grande distribution et zone industrielle — idéal pour cibler les professionnels et consommateurs de Basse-Terre.",
    },
    {
      icon: "🌴",
      title: "Tourisme & saison haute",
      desc: "De décembre à avril, le flux touristique décuple l'audience dans les zones de Pointe-à-Pitre, Le Gosier et Sainte-Anne.",
    },
  ],
  faqs: [
    {
      q: `Combien coûte une campagne de publicité sur véhicule en Guadeloupe ?`,
      a: `Le tarif plancher est de 1,80 €/km²/jour (2,70 € en zone dense autour de Pointe-à-Pitre et Baie-Mahault). Avec un minimum de 25 €/jour par véhicule, une campagne d'une semaine sur 3 véhicules coûte à partir de 525 €, avec un rapport GPS certifié inclus.`,
    },
    {
      q: `Quels véhicules peuvent transporter ma publicité en Guadeloupe ?`,
      a: `Tous les véhicules inscrits sur MoveSpot en Guadeloupe : taxis, VTC, véhicules de livraison, utilitaires de Jarry, fourgons inter-villes. Chaque véhicule est validé avec photos et SIRET (ou équivalent DOM).`,
    },
    {
      q: `Comment le suivi GPS fonctionne-t-il dans les DOM ?`,
      a: `La connexion GPS fonctionne exactement comme en métropole. Chaque véhicule envoie sa position toutes les 30 secondes. Vous visualisez les trajets sur la carte, les km parcourus dans votre zone et les impressions estimées par densité de population locale.`,
    },
    {
      q: `Puis-je cibler uniquement la zone commerciale de Jarry ?`,
      a: `Oui. Avec l'outil de dessin de zones (polygone libre), vous délimitez précisément la ZAC de Houelbourg / Jarry, la N1 ou tout autre axe. Le budget se calcule automatiquement en fonction de la surface dessinée.`,
    },
  ],
};

const SCHEMA_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Publicité sur véhicule en Guadeloupe — MoveSpot",
    description:
      "Régie publicitaire mobile GPS-certifiée en Guadeloupe : campagnes sur taxis, VTC et utilitaires à Baie-Mahault, Pointe-à-Pitre, Les Abymes, Jarry et Le Gosier.",
    provider: { "@id": "https://move-spot.com/#organization" },
    areaServed: [
      { "@type": "City", name: "Baie-Mahault" },
      { "@type": "City", name: "Pointe-à-Pitre" },
      { "@type": "City", name: "Les Abymes" },
      { "@type": "City", name: "Le Gosier" },
      { "@type": "Place", name: "Jarry, Guadeloupe" },
    ],
    serviceType: "Publicité extérieure mobile",
    category: "DOOH mobile",
    offers: {
      "@type": "Offer",
      priceCurrency: "EUR",
      price: "25",
      priceSpecification: { "@type": "UnitPriceSpecification", unitText: "par véhicule / jour" },
      availability: "https://schema.org/InStock",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: CONFIG.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export const Route = createFileRoute("/_public/publicite-voiture-guadeloupe")({
  head: () =>
    buildSeoHead({
      title: "Publicité sur voiture en Guadeloupe — Campagnes locales GPS | MoveSpot",
      description:
        "Lancez votre campagne de publicité mobile sur véhicule en Guadeloupe : Baie-Mahault, Pointe-à-Pitre, Les Abymes, Jarry. Ciblage GPS certifié, dès 25 €/jour.",
      path: "/publicite-voiture-guadeloupe",
      jsonLd: SCHEMA_LD,
    }),
  component: () => <LocalLandingPage config={CONFIG} />,
});
