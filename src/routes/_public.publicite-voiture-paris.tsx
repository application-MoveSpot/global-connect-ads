import { createFileRoute } from "@tanstack/react-router";
import { buildSeoHead } from "@/components/SEO";
import { LocalLandingPage, type LocalPageConfig } from "@/components/shared/LocalLandingPage";

const CONFIG: LocalPageConfig = {
  city: "Paris & Île-de-France",
  cityShort: "Paris",
  zones: [
    "Paris intramuros",
    "Boulogne-Billancourt",
    "Vincennes",
    "Saint-Denis",
    "Nanterre",
    "Versailles",
    "Créteil",
    "Périphérique & A86",
    "Val-de-Marne",
    "Seine-Saint-Denis",
  ],
  highlights: [
    {
      icon: "🚕",
      title: "12 000+ taxis & VTC parisiens",
      desc: "Le bassin parisien concentre la plus grande densité de taxis et VTC de France — des milliers de véhicules traversent quotidiennement vos zones cibles.",
    },
    {
      icon: "🗺️",
      title: "Ciblage par arrondissement",
      desc: "Dessinez votre polygone autour du 8e, de La Défense ou de Saint-Denis Arena. Le Périphérique et l'A86 sont des axes à très fort trafic.",
    },
    {
      icon: "📊",
      title: "CPM parmi les plus bas du marché",
      desc: "À Paris, la densité de population garantit des impressions élevées à faible coût au contact. MoveSpot calcule automatiquement vos estimations d'audience.",
    },
  ],
  faqs: [
    {
      q: `Combien coûte une campagne de publicité sur véhicule à Paris ?`,
      a: `À Paris intramuros et en Île-de-France (zone dense), le tarif est de 2,70 €/km²/jour — le tarif haute densité s'applique automatiquement selon la zone dessinée. Le minimum reste 25 €/jour par véhicule. Pour une campagne d'une semaine sur le 8e arrondissement avec 5 véhicules, comptez environ 1 100 €.`,
    },
    {
      q: `Quels axes parisiens peut-on cibler avec MoveSpot ?`,
      a: `Vous dessinez librement votre zone sur la carte : Périphérique, A86, Boulevard Haussmann, Champs-Élysées, La Défense, Roissy-CDG, Orly. Les véhicules dont les trajets traversent votre polygone proposent leur prix. Vous choisissez ceux qui correspondent à votre stratégie.`,
    },
    {
      q: `Combien rapporte la publicité sur sa voiture à Paris ?`,
      a: `En Île-de-France, la forte densité de population maximise la rémunération des propriétaires. Le minimum garanti est de 17,50 €/jour actif (70 % du tarif annonceur). En zone dense comme Paris intramuros ou La Défense, les revenus peuvent atteindre 49 €/jour.`,
    },
    {
      q: `Faut-il un covering complet du véhicule pour faire de la publicité à Paris ?`,
      a: `Non. MoveSpot propose plusieurs formats : covering intégral, flancs de portières, coffre, pavillon. Chaque format est installé par un poseur certifié MoveSpot. Vous choisissez le format dans votre brief.`,
    },
  ],
};

const SCHEMA_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Publicité sur véhicule à Paris & Île-de-France — MoveSpot",
    description:
      "Régie publicitaire mobile GPS-certifiée en Île-de-France : campagnes sur taxis, VTC et utilitaires à Paris, Boulogne-Billancourt, Saint-Denis, Créteil, Nanterre.",
    provider: { "@id": "https://move-spot.com/#organization" },
    areaServed: [
      { "@type": "City", name: "Paris" },
      { "@type": "City", name: "Boulogne-Billancourt" },
      { "@type": "City", name: "Saint-Denis" },
      { "@type": "City", name: "Nanterre" },
      { "@type": "AdministrativeArea", name: "Île-de-France" },
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

export const Route = createFileRoute("/_public/publicite-voiture-paris")({
  head: () =>
    buildSeoHead({
      title: "Publicité sur voiture à Paris & Île-de-France — Régie mobile GPS | MoveSpot",
      description:
        "Campagnes de publicité mobile sur véhicule à Paris et en Île-de-France. Ciblage GPS par arrondissement, Périphérique, A86. Dès 25 €/jour, rapport certifié inclus.",
      path: "/publicite-voiture-paris",
      jsonLd: SCHEMA_LD,
    }),
  component: () => <LocalLandingPage config={CONFIG} />,
});
