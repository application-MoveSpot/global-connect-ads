import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/components/SEO";
import { LocalLandingPage, type LocalPageConfig } from "@/components/shared/LocalLandingPage";

const CONFIG: LocalPageConfig = {
  city: "Lyon & Villeurbanne",
  cityShort: "Lyon",
  zones: [
    "Lyon 1er–9e",
    "Villeurbanne",
    "Vieux-Lyon",
    "La Part-Dieu",
    "Presqu'île",
    "Confluence",
    "Gerland",
    "Périphérique Nord/Sud",
    "Mions & aéroport Saint-Exupéry",
  ],
  highlights: [
    {
      icon: "🏙️",
      title: "2e aire urbaine de France",
      desc: "Avec 1,4 million d'habitants dans la métropole, Lyon offre une couverture dense sur la Presqu'île, La Part-Dieu et les 9 arrondissements.",
    },
    {
      icon: "🚇",
      title: "Axes périphériques stratégiques",
      desc: "Le Boulevard Périphérique Nord/Sud, l'A6/A7 et les quais du Rhône sont des corridors à très fort trafic qui maximisent les impressions publicitaires.",
    },
    {
      icon: "🎪",
      title: "Événements & foires",
      desc: "Euronext Lyon, Sirha, Sirha Green — ciblez les grandes périodes d'affluence avec des campagnes sur véhicule activables en 24 h.",
    },
  ],
  faqs: [
    {
      q: `Combien coûte une campagne de publicité sur véhicule à Lyon ?`,
      a: `Dans la métropole lyonnaise, le tarif haute densité est de 2,70 €/km²/jour. Pour une campagne d'une semaine centrée sur La Part-Dieu ou la Confluence avec 3 véhicules, comptez environ 630 €, rapport GPS inclus.`,
    },
    {
      q: `Quels quartiers de Lyon peut-on cibler avec MoveSpot ?`,
      a: `Tous les quartiers sont accessibles : Presqu'île, Vieux-Lyon, Gerland, Confluence, Villeurbanne, La Duchère, et même l'aéroport Saint-Exupéry via la voie rapide. Vous dessinez librement votre polygone sur la carte interactive.`,
    },
    {
      q: `Combien de véhicules MoveSpot sont disponibles à Lyon ?`,
      a: `La flotte disponible dans la métropole lyonnaise comprend des taxis, des VTC, des véhicules de livraison et des utilitaires. Inscrivez votre brief : les propriétaires dont les trajets traversent votre zone proposeront leur offre sous 48 h.`,
    },
    {
      q: `Puis-je lancer une campagne lors des périodes de forte affluence à Lyon ?`,
      a: `Oui, MoveSpot permet de créer des campagnes ponctuelles de quelques jours pour accompagner les pics de fréquentation dans la métropole. Pensez à soumettre votre brief au moins 7 jours à l'avance afin de permettre aux propriétaires de confirmer leur disponibilité sur la période souhaitée.`,
    },
  ],
};

const SCHEMA_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Publicité sur véhicule à Lyon & Villeurbanne — MoveSpot",
    description:
      "Régie publicitaire mobile GPS-certifiée dans la métropole lyonnaise : campagnes sur taxis, VTC et utilitaires à Lyon, Villeurbanne, La Part-Dieu, Presqu'île et Confluence.",
    provider: { "@id": "https://move-spot.com/#organization" },
    areaServed: [
      { "@type": "City", name: "Lyon" },
      { "@type": "City", name: "Villeurbanne" },
      { "@type": "AdministrativeArea", name: "Métropole de Lyon" },
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

export const Route = createFileRoute("/_public/publicite-voiture-lyon")({
  head: () =>
    buildSeoHead({
      title: "Publicité sur voiture à Lyon & Villeurbanne — Régie mobile GPS | MoveSpot",
      description:
        "Lancez votre campagne de publicité mobile sur véhicule à Lyon, Villeurbanne et l'agglomération lyonnaise. Ciblage GPS par quartier (Part-Dieu, Confluence). Dès 25 €/jour.",
      path: "/publicite-voiture-lyon",
      jsonLd: SCHEMA_LD,
    }),
  component: () => <LocalLandingPage config={CONFIG} />,
});
