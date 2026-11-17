import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/components/SEO";
import { LocalLandingPage, type LocalPageConfig } from "@/components/shared/LocalLandingPage";

const CONFIG: LocalPageConfig = {
  city: "Marseille & Aix-en-Provence",
  cityShort: "Marseille",
  zones: [
    "Marseille 1er–16e",
    "Aix-en-Provence",
    "Vieux-Port",
    "La Canebière",
    "Euroméditerranée",
    "Aubagne",
    "Martigues",
    "A7 & Boulevard Michelet",
    "Plan-de-Campagne",
  ],
  highlights: [
    {
      icon: "⚓",
      title: "Vieux-Port & Euroméditerranée",
      desc: "Le cœur touristique et économique de Marseille : des milliers de piétons et automobilistes passent quotidiennement par le Vieux-Port, La Canebière et le pôle Euroméditerranée.",
    },
    {
      icon: "🛣️",
      title: "A7 & boulevard Michelet",
      desc: "L'autoroute du Soleil (A7) et le boulevard Michelet sont les artères nord-sud de Marseille — des axes à très fort trafic pour maximiser la visibilité de votre marque.",
    },
    {
      icon: "🌊",
      title: "Bassin de Provence",
      desc: "Le bassin Marseille–Aix-en-Provence concentre 2 millions d'habitants et Plan-de-Campagne est l'une des plus grandes zones commerciales de France.",
    },
  ],
  faqs: [
    {
      q: `Combien coûte une campagne de publicité sur véhicule à Marseille ?`,
      a: `Dans le centre de Marseille et autour d'Aix-en-Provence (zones denses), le tarif est de 2,70 €/km²/jour. En périphérie ou sur l'axe A7, le tarif est de 1,80 €/km²/jour. Le minimum reste 25 €/jour par véhicule. Une campagne d'une semaine sur le Vieux-Port avec 3 véhicules revient à environ 630 €.`,
    },
    {
      q: `Puis-je cibler uniquement Aix-en-Provence avec MoveSpot ?`,
      a: `Oui. Dessinez un polygone autour du cours Mirabeau, de la zone d'activités des Milles ou du campus universitaire. Les propriétaires de véhicules dont les trajets traversent cette zone répondent à votre brief de façon indépendante des campagnes marseillaises.`,
    },
    {
      q: `Combien rapporte la publicité sur sa voiture à Marseille ?`,
      a: `Le minimum garanti est de 17,50 €/jour actif pour tout véhicule inscrit en région PACA. En zone dense (Vieux-Port, Canebière, Plan-de-Campagne), les revenus peuvent atteindre 49 €/jour. Les paiements sont effectués par virement mensuel.`,
    },
    {
      q: `Quels formats de publicité sont disponibles à Marseille ?`,
      a: `Covering intégral, flancs de portières, coffre et pavillon. Chaque format est posé par un prestataire certifié MoveSpot en région PACA. Les délais de production sont de 7 à 14 jours selon le format et la complexité graphique.`,
    },
  ],
};

const SCHEMA_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Publicité sur véhicule à Marseille & Aix-en-Provence — MoveSpot",
    description:
      "Régie publicitaire mobile GPS-certifiée en région PACA : campagnes sur taxis, VTC et utilitaires à Marseille, Aix-en-Provence, Vieux-Port, Euroméditerranée et Plan-de-Campagne.",
    provider: { "@id": "https://move-spot.com/#organization" },
    areaServed: [
      { "@type": "City", name: "Marseille" },
      { "@type": "City", name: "Aix-en-Provence" },
      { "@type": "City", name: "Aubagne" },
      { "@type": "AdministrativeArea", name: "Bouches-du-Rhône" },
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

export const Route = createFileRoute("/_public/publicite-voiture-marseille")({
  head: () =>
    buildSeoHead({
      title: "Publicité sur voiture à Marseille & Aix-en-Provence — Régie mobile GPS | MoveSpot",
      description:
        "Campagnes de publicité mobile sur véhicule à Marseille et Aix-en-Provence. Ciblage GPS par quartier (Vieux-Port, Canebière, Euroméditerranée). Dès 25 €/jour.",
      path: "/publicite-voiture-marseille",
      jsonLd: SCHEMA_LD,
    }),
  component: () => <LocalLandingPage config={CONFIG} />,
});
