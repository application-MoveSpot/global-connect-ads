import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogoLink } from "@/components/app/LogoLink";
import { cn } from "@/lib/utils";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/advertiser/etude-marche")({
  head: () => ({
    meta: [
      { title: "Étude de marché — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EtudeMarche,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

// ─── Catalogue véhicules ──────────────────────────────────────────────────────

type VehicleEntry = {
  key: string;
  emoji: string;
  label: string;
  formats: string[];
  prixMin: number;
  prixMax: number;
  impressionsMin: number;
  impressionsMax: number;
  demandePct: number;
  zones: string[];
  atout: string;
};

const CATALOGUE: VehicleEntry[] = [
  {
    key: "camion_led",
    emoji: "📺",
    label: "Camion LED (BoxLED)",
    formats: ["Vidéo MP4 plein écran", "Image JPEG/PNG dynamique", "Flux HTML5 temps réel"],
    prixMin: 150,
    prixMax: 800,
    impressionsMin: 5000,
    impressionsMax: 20000,
    demandePct: 25,
    zones: ["Centre-ville", "Événementiel", "Grands axes", "Zones à fort trafic"],
    atout:
      "3 faces écran LED IP67 haute luminosité (3200×1920 px) — visibilité maximale jour et nuit",
  },
  {
    key: "taxi",
    emoji: "🚕",
    label: "Taxi / VTC",
    formats: ["Covering total", "Totem toit", "Stickers latéraux"],
    prixMin: 15,
    prixMax: 35,
    impressionsMin: 800,
    impressionsMax: 2000,
    demandePct: 28,
    zones: ["Centre-ville", "Aéroports", "Gares"],
    atout: "Haute mobilité, présence 24h/24",
  },
  {
    key: "van",
    emoji: "🚐",
    label: "Van utilitaire",
    formats: ["Covering flancs", "Covering arrière", "Bâche intégrale"],
    prixMin: 20,
    prixMax: 45,
    impressionsMin: 1200,
    impressionsMax: 3000,
    demandePct: 22,
    zones: ["Artères urbaines", "Zones commerciales", "Périphérie"],
    atout: "Grande surface d'affichage (4–6 m²)",
  },
  {
    key: "food_truck",
    emoji: "🚚",
    label: "Food truck",
    formats: ["Covering carrosserie", "Enseigne lumineuse", "Vitrage"],
    prixMin: 12,
    prixMax: 28,
    impressionsMin: 600,
    impressionsMax: 1800,
    demandePct: 10,
    zones: ["Événementiel", "Marchés", "Quartiers d'affaires"],
    atout: "Audience captive + temps de contact élevé",
  },
  {
    key: "tutuk",
    emoji: "🛺",
    label: "Tutuk",
    formats: ["Covering complet", "Toile tendue", "LED extérieur"],
    prixMin: 10,
    prixMax: 25,
    impressionsMin: 600,
    impressionsMax: 1400,
    demandePct: 8,
    zones: ["Touristique", "Centre historique", "Zones festives"],
    atout: "Originalité et mémorisation forte, format unique",
  },
  {
    key: "scooter",
    emoji: "🛵",
    label: "Scooter livraison",
    formats: ["Top box grand format", "Stickers flancs", "Tablier avant"],
    prixMin: 5,
    prixMax: 14,
    impressionsMin: 400,
    impressionsMax: 1000,
    demandePct: 5,
    zones: ["Centre-ville", "Quartiers denses", "Livraison last mile"],
    atout: "Accès zones piétonnes, flotte dense",
  },
  {
    key: "velo_cargo",
    emoji: "🚲",
    label: "Vélo cargo",
    formats: ["Caisse latérale", "Bâche cargo", "Écran embarqué"],
    prixMin: 6,
    prixMax: 16,
    impressionsMin: 300,
    impressionsMax: 800,
    demandePct: 4,
    zones: ["Zones piétonnes", "Pistes cyclables", "Marchés"],
    atout: "Image éco-responsable, zones sans voiture",
  },
  {
    key: "triporteur",
    emoji: "🛺",
    label: "Triporteur",
    formats: ["Caisse cargo", "Toile tendue", "Panneau arrière"],
    prixMin: 7,
    prixMax: 18,
    impressionsMin: 350,
    impressionsMax: 900,
    demandePct: 3,
    zones: ["Centres commerciaux", "Rues commerçantes", "Marchés"],
    atout: "Manœuvrabilité en zone dense",
  },
  {
    key: "velo_remorque",
    emoji: "🚲",
    label: "Vélo remorque",
    formats: ["Remorque panoramique", "Bâche grande surface"],
    prixMin: 8,
    prixMax: 20,
    impressionsMin: 400,
    impressionsMax: 1000,
    demandePct: 0,
    zones: ["Événementiel", "Marchés", "Parcs"],
    atout: "Grande surface d'affichage à vélo",
  },
  {
    key: "voiture",
    emoji: "🚗",
    label: "Voiture",
    formats: ["Covering partiel", "Pastilles magnétiques", "Arrière vitré"],
    prixMin: 8,
    prixMax: 22,
    impressionsMin: 500,
    impressionsMax: 1400,
    demandePct: 0,
    zones: ["Résidentiel", "Banlieue", "Axes périurbains"],
    atout: "Flotte disponible en grande quantité",
  },
  {
    key: "autre",
    emoji: "🚌",
    label: "Autre véhicule",
    formats: ["Sur mesure"],
    prixMin: 5,
    prixMax: 50,
    impressionsMin: 200,
    impressionsMax: 3000,
    demandePct: 0,
    zones: ["Variable"],
    atout: "Flexibilité maximale",
  },
];

// ─── Zones par région ─────────────────────────────────────────────────────────

type Region = "europe" | "afrique" | "asie" | "amerique" | "moyen_orient";

const REGION_ZONES: Partial<Record<Region, Partial<Record<string, string[]>>>> = {
  moyen_orient: {
    camion_led: [
      "Downtown Dubaï",
      "Sheikh Zayed Road",
      "Événements GITEX / Expo",
      "Mall of Emirates",
    ],
    taxi: ["Downtown Dubaï / Riyad", "Aéroports internationaux", "Business Bay"],
    van: ["Deira / Bur Dubai", "Zones commerciales", "Abu Dhabi / Doha"],
    food_truck: ["Événements Golfe", "Business Districts", "Zones touristiques"],
    tutuk: ["Zones touristiques", "Souks historiques", "Zones festives"],
    scooter: ["Downtown", "Quartiers denses", "Livraison last mile"],
    velo_cargo: ["Zones piétonnes", "Community areas", "Marchés"],
    triporteur: ["Centres commerciaux", "Souks", "Marchés locaux"],
    velo_remorque: ["Événements", "Parcs / Corniche", "Zones touristiques"],
    voiture: ["Résidentiel premium", "Al Quoz / Jumeirah", "Axes périurbains"],
  },
  afrique: {
    camion_led: ["Centre-ville", "Événementiel", "Axes principaux", "Zones à fort trafic"],
    taxi: ["Centre-ville Dakar/Abidjan", "Aéroports", "Gares routières"],
    van: ["Artères principales", "Zones commerciales", "Périphérie"],
    food_truck: ["Événementiel", "Marchés locaux", "Quartiers d'affaires"],
    tutuk: ["Touristique", "Centre historique", "Zones festives"],
    scooter: ["Centre-ville", "Quartiers denses", "Livraison last mile"],
    velo_cargo: ["Zones piétonnes", "Marchés", "Pistes cyclables"],
    triporteur: ["Marchés", "Rues commerçantes", "Centres commerciaux"],
    voiture: ["Résidentiel", "Banlieue", "Axes périurbains"],
  },
  asie: {
    camion_led: [
      "Centre-ville Bangkok/HCMV",
      "Événements",
      "Artères principales",
      "Zones à fort trafic",
    ],
    taxi: ["Centre-ville Bangkok/HCMV", "Aéroports", "Zones touristiques"],
    van: ["Artères urbaines", "Zones commerciales", "Périphérie"],
    food_truck: ["Événementiel", "Marchés locaux", "Quartiers d'affaires"],
    tutuk: ["Touristique", "Temple / Centre historique", "Zones festives"],
    scooter: ["Centre-ville", "Quartiers denses", "Livraison last mile"],
  },
  amerique: {
    camion_led: ["Centro Histórico", "Événements", "Avenidas principales", "Zones à fort trafic"],
    taxi: ["Centro Histórico Mexico/SP", "Aéroports", "Zones touristiques"],
    van: ["Artères urbaines", "Zones commerciales", "Périphérie"],
    food_truck: ["Événementiel", "Food markets", "Quartiers d'affaires"],
    scooter: ["Centre-ville", "Quartiers denses", "Livraison last mile"],
  },
};

function getZones(vehicleKey: string, region: Region): string[] {
  return (
    REGION_ZONES[region]?.[vehicleKey] ?? CATALOGUE.find((v) => v.key === vehicleKey)?.zones ?? []
  );
}

// ─── Marché cible ─────────────────────────────────────────────────────────────

type RegionData = {
  label: string;
  flag: string;
  marcheTaille: string;
  marcheSegment: string;
  marcheCroissance: string;
  marcheDesc: [string, string];
  kpis: { v: string; l: string; s: string }[];
  gmv: number[];
  comm: number[];
  revers: number[];
  charges: number[];
  net: number[];
  treso: number[];
  vehicules: number[];
  marge: number[];
  structure: string[];
  urssaf: number[];
  vl: number[];
  is: number[];
  fiscalLabels: { urssaf: string; vl: string; is: string; note: string };
  roadmap: { year: string; phase: string; gmv: string; items: string[] }[];
};

const REGION_DATA: Record<Region, RegionData> = {
  europe: {
    label: "Europe",
    flag: "",
    marcheTaille: "7 Mds €",
    marcheSegment: "1,2 Md €",
    marcheCroissance: "+18 %",
    marcheDesc: [
      "La publicité extérieure représente 7 milliards € en France (+6 %/an). Le Digital OOH constitue 35 % du marché et croît de +22 %/an. Le segment publicité mobile sur véhicules est estimé à 1,2 Md € avec +18 %/an — le rythme le plus rapide du secteur.",
      "MoveSpot adresse ce segment avec une proposition unique : ciblage géographique précis par zone polygone, mesure GPS temps réel et activation sous 7 jours — avantages qu'aucun affichage statique ne peut offrir.",
    ],
    kpis: [
      { v: "7 Mds €", l: "Marché OOH Europe", s: "+6 %/an" },
      { v: "+18 %", l: "Croissance mobile OOH", s: "Segment le plus rapide" },
      { v: "30 %", l: "Commission MoveSpot", s: "Sur GMV advertisers" },
      { v: "901 836 €", l: "CA An 5", s: "Marge nette 50 %" },
      { v: "650", l: "Véhicules An 5", s: "Démarrage : 15" },
      { v: "3 006 120 €", l: "GMV An 5", s: "70 % reversé propriétaires" },
    ],
    gmv: [37620, 191880, 668736, 1600560, 3006120],
    comm: [11286, 57564, 200621, 480168, 901836],
    revers: [26334, 134316, 468115, 1120392, 2104284],
    charges: [6137, 16054, 75637, 167610, 298510],
    net: [2564, 28327, 93738, 234419, 452495],
    treso: [2564, 30891, 124629, 359048, 811543],
    vehicules: [15, 60, 180, 380, 650],
    marge: [22.7, 49.2, 46.7, 48.8, 50.2],
    structure: ["Micro-BIC", "Micro-BIC", "SASU (IS)", "SASU (IS)", "SASU (IS)"],
    urssaf: [2393, 12204, 0, 0, 0],
    vl: [192, 979, 0, 0, 0],
    is: [0, 0, 31246, 78140, 150832],
    fiscalLabels: {
      urssaf: "URSSAF micro (21,2 % — An 1-2)",
      vl: "Versement libératoire IR (1,7 %)",
      is: "Impôt sur les sociétés (25 % — An 3-5)",
      note: "Hypothèses : commission stable à 30 % du GMV. Moyenne 2 100 €/véhicule/mois facturé. Passage SASU à partir de l'An 3 (seuil micro-BIC dépassé). Apport initial nul.",
    },
    roadmap: [
      {
        year: "An 1",
        phase: "Lancement MVP",
        gmv: "37 620 €",
        items: [
          "Île-de-France prioritaire",
          "15 véhicules partners",
          "10 advertisers pilotes",
          "Stripe Connect + GPS live",
          "Prestataires couvrant Paris",
        ],
      },
      {
        year: "An 2",
        phase: "Expansion régionale",
        gmv: "191 880 €",
        items: [
          "Lyon, Marseille, Bordeaux",
          "60 véhicules partners",
          "Tutuk & vélo cargo actifs",
          "Brief en ligne v2",
          "Partenaires réseau apporteurs",
        ],
      },
      {
        year: "An 3",
        phase: "Croissance nationale",
        gmv: "668 736 €",
        items: [
          "10+ villes, 180 véhicules",
          "Passage SASU (IS)",
          "Campagnes multi-villes",
          "API agences médias",
          "Dashboard analytics advertisers",
        ],
      },
      {
        year: "An 4–5",
        phase: "Scale & consolidation",
        gmv: "3 006 120 €",
        items: [
          "30+ villes, 380–650 véhicules",
          "Offre grands comptes",
          "Mesure DOOH certifiée",
          "Intégrations agences",
          "Potentiel export Europe",
        ],
      },
    ],
  },
  afrique: {
    label: "Afrique",
    flag: "",
    marcheTaille: "3,5 Mds $",
    marcheSegment: "350 M€",
    marcheCroissance: "+25 %",
    marcheDesc: [
      "La publicité extérieure en Afrique représente 3,5 milliards $ (+12 %/an). L'urbanisation rapide et la pénétration mobile créent une demande forte pour la publicité sur véhicules — segment estimé à 350 M€ avec +25 %/an, principalement en Afrique de l'Ouest et du Nord.",
      'MoveSpot s\'adapte aux spécificités africaines : moto-taxis ("zems"), minibus "bush taxis", tutuks et camions — véhicules omniprésents dans les grandes agglomérations comme Dakar, Abidjan, Casablanca ou Lagos.',
    ],
    kpis: [
      { v: "3,5 Mds $", l: "Marché OOH Afrique", s: "+12 %/an" },
      { v: "+25 %", l: "Croissance mobile OOH", s: "Marché émergent fort" },
      { v: "30 %", l: "Commission MoveSpot", s: "Sur GMV advertisers" },
      { v: "585 000 €", l: "CA An 5", s: "Marge nette 49 %" },
      { v: "480", l: "Véhicules An 5", s: "Démarrage : 10" },
      { v: "1 950 000 €", l: "GMV An 5", s: "70 % reversé propriétaires" },
    ],
    gmv: [22000, 95000, 310000, 820000, 1950000],
    comm: [6600, 28500, 93000, 246000, 585000],
    revers: [15400, 66500, 217000, 574000, 1365000],
    charges: [4500, 11000, 52000, 118000, 205000],
    net: [1200, 12800, 32000, 98000, 285000],
    treso: [1200, 14000, 46000, 144000, 429000],
    vehicules: [10, 35, 110, 250, 480],
    marge: [18.2, 44.9, 34.4, 39.8, 48.7],
    structure: ["Auto-entrepreneur", "Auto-entrepreneur", "SARL (IS)", "SARL (IS)", "SARL (IS)"],
    urssaf: [760, 3900, 0, 0, 0],
    vl: [140, 800, 0, 0, 0],
    is: [0, 0, 9000, 30000, 95000],
    fiscalLabels: {
      urssaf: "Cotisations sociales micro (An 1-2)",
      vl: "Taxe libératoire locale (An 1-2)",
      is: "Impôt sur les sociétés (25 % — An 3-5)",
      note: "Hypothèses : commission stable à 30 % du GMV. Moyenne 1 500 €/véhicule/mois. Passage SARL à partir de l'An 3. Apport initial nul.",
    },
    roadmap: [
      {
        year: "An 1",
        phase: "Pilot Dakar / Abidjan",
        gmv: "22 000 €",
        items: [
          "Dakar & Abidjan pilotes",
          "10 moto-taxis + tutuks",
          "8 advertisers locaux",
          "Stripe + Mobile Money",
          "Partenaires locaux covering",
        ],
      },
      {
        year: "An 2",
        phase: "Expansion Afrique de l'Ouest",
        gmv: "95 000 €",
        items: [
          "Lagos, Casablanca, Accra",
          "35 véhicules partners",
          "Minibus bush taxis actifs",
          "App mobile offline-first",
          "Régie publicitaire locale",
        ],
      },
      {
        year: "An 3",
        phase: "Déploiement régional",
        gmv: "310 000 €",
        items: [
          "8+ métropoles, 110 véhicules",
          "Passage SARL (IS)",
          "Campagnes cross-pays",
          "Partenariat télécom OOH",
          "Analytics GPS adapté",
        ],
      },
      {
        year: "An 4–5",
        phase: "Leader mobile OOH Afrique",
        gmv: "1 950 000 €",
        items: [
          "20+ villes, 250–480 véhicules",
          "Franchise locale partenaires",
          "Mesure DOOH certifiée",
          "Levée de fonds impact",
          "Expansion Afrique de l'Est",
        ],
      },
    ],
  },
  asie: {
    label: "Asie",
    flag: "",
    marcheTaille: "8 Mds $",
    marcheSegment: "720 M€",
    marcheCroissance: "+30 %",
    marcheDesc: [
      "L'Asie du Sud-Est et du Sud représente le plus grand marché de publicité mobile sur véhicules — 8 milliards $ pour l'OOH total, +15 %/an. La densité urbaine exceptionnelle (Bangkok, Hô Chi Minh Ville, Mumbai, Jakarta) génère un potentiel d'impressions sans équivalent.",
      "Tuks-tuks, mototaxis, rickshaws électriques et minibus sont les vecteurs idéaux de MoveSpot en Asie. Le segment mobile OOH est estimé à 720 M€ avec +30 %/an, porté par l'essor des marques FMCG et des startups tech locales.",
    ],
    kpis: [
      { v: "8 Mds $", l: "Marché OOH Asie", s: "+15 %/an" },
      { v: "+30 %", l: "Croissance mobile OOH", s: "Densité urbaine record" },
      { v: "30 %", l: "Commission MoveSpot", s: "Sur GMV advertisers" },
      { v: "1 560 000 €", l: "CA An 5", s: "Marge nette 48 %" },
      { v: "900", l: "Véhicules An 5", s: "Démarrage : 20" },
      { v: "5 200 000 €", l: "GMV An 5", s: "70 % reversé propriétaires" },
    ],
    gmv: [58000, 320000, 1100000, 2700000, 5200000],
    comm: [17400, 96000, 330000, 810000, 1560000],
    revers: [40600, 224000, 770000, 1890000, 3640000],
    charges: [9800, 28000, 122000, 268000, 495000],
    net: [3800, 44000, 152000, 388000, 755000],
    treso: [3800, 47800, 199800, 587800, 1342800],
    vehicules: [20, 80, 250, 520, 900],
    marge: [21.8, 45.8, 46.1, 47.9, 48.4],
    structure: ["LLC locale", "LLC locale", "Holding (IS)", "Holding (IS)", "Holding (IS)"],
    urssaf: [3200, 19000, 0, 0, 0],
    vl: [600, 5000, 0, 0, 0],
    is: [0, 0, 56000, 154000, 310000],
    fiscalLabels: {
      urssaf: "Cotisations LLC locale (An 1-2)",
      vl: "Taxe locale libératoire (An 1-2)",
      is: "Impôt sur les sociétés (25 % — An 3-5)",
      note: "Hypothèses : commission stable à 30 % du GMV. Moyenne 2 400 €/véhicule/mois. Passage Holding à partir de l'An 3. Apport initial nul.",
    },
    roadmap: [
      {
        year: "An 1",
        phase: "Pilot Bangkok / HCMV",
        gmv: "58 000 €",
        items: [
          "Bangkok & Hô Chi Minh Ville",
          "20 tuks-tuks + mototaxis",
          "15 advertisers FMCG",
          "QR code + GPS tracking",
          "Partenaire tuk-tuk local",
        ],
      },
      {
        year: "An 2",
        phase: "Expansion SE Asie",
        gmv: "320 000 €",
        items: [
          "Jakarta, Kuala Lumpur, Manila",
          "80 véhicules partners",
          "Rickshaws électriques actifs",
          "Brief multilingue (EN/TH/VI)",
          "API annonceurs nationaux",
        ],
      },
      {
        year: "An 3",
        phase: "Déploiement Inde & Chine",
        gmv: "1 100 000 €",
        items: [
          "Mumbai, Chennai, Bangalore",
          "250 véhicules, 3 pays",
          "Passage structure holding",
          "Campagnes pan-asiatiques",
          "Partenariat OOH networks",
        ],
      },
      {
        year: "An 4–5",
        phase: "Leader OOH mobile Asie",
        gmv: "5 200 000 €",
        items: [
          "15+ métropoles, 520–900 véhicules",
          "Offre grands groupes asiatiques",
          "DOOH mobile certifié",
          "Plateforme SaaS white-label",
          "Potentiel expansion mondiale",
        ],
      },
    ],
  },
  amerique: {
    label: "Amérique",
    flag: "",
    marcheTaille: "12 Mds $",
    marcheSegment: "850 M€",
    marcheCroissance: "+22 %",
    marcheDesc: [
      "Le marché OOH américain pèse 12 milliards $ (Amérique du Nord + Latine). L'Amérique latine connaît une explosion de la publicité mobile urbaine (+28 %/an) tandis que l'Amérique du Nord affiche une forte demande pour les formats véhicules de livraison et food trucks.",
      "MoveSpot adresse les grandes métropoles : Mexico, São Paulo, Buenos Aires, Miami. Le segment mobile OOH est estimé à 850 M€ avec +22 %/an, tiré par les marques consumer goods, la fintech et les plateformes digitales.",
    ],
    kpis: [
      { v: "12 Mds $", l: "Marché OOH Amériques", s: "+10 %/an" },
      { v: "+22 %", l: "Croissance mobile OOH", s: "LATAM en forte demande" },
      { v: "30 %", l: "Commission MoveSpot", s: "Sur GMV advertisers" },
      { v: "1 230 000 €", l: "CA An 5", s: "Marge nette 49 %" },
      { v: "760", l: "Véhicules An 5", s: "Démarrage : 18" },
      { v: "4 100 000 €", l: "GMV An 5", s: "70 % reversé propriétaires" },
    ],
    gmv: [48000, 245000, 880000, 2150000, 4100000],
    comm: [14400, 73500, 264000, 645000, 1230000],
    revers: [33600, 171500, 616000, 1505000, 2870000],
    charges: [8200, 21000, 98000, 212000, 380000],
    net: [3100, 35500, 120000, 305000, 605000],
    treso: [3100, 38600, 158600, 463600, 1068600],
    vehicules: [18, 72, 220, 455, 760],
    marge: [21.5, 48.3, 45.5, 47.3, 49.2],
    structure: ["LLC (US/MX)", "LLC (US/MX)", "Corp (IS)", "Corp (IS)", "Corp (IS)"],
    urssaf: [2600, 13000, 0, 0, 0],
    vl: [500, 4000, 0, 0, 0],
    is: [0, 0, 46000, 128000, 245000],
    fiscalLabels: {
      urssaf: "Payroll taxes LLC (An 1-2)",
      vl: "Taxe locale libératoire (An 1-2)",
      is: "Corporate income tax (25 % — An 3-5)",
      note: "Hypothèses : commission stable à 30 % du GMV. Moyenne 2 200 €/véhicule/mois. Passage Corp à partir de l'An 3. Apport initial nul.",
    },
    roadmap: [
      {
        year: "An 1",
        phase: "Pilot Mexico / Miami",
        gmv: "48 000 €",
        items: [
          "Mexico City & Miami pilotes",
          "18 vans + food trucks",
          "12 advertisers consumer",
          "Stripe USD + MXN",
          "Partenaires covering locaux",
        ],
      },
      {
        year: "An 2",
        phase: "Expansion LATAM",
        gmv: "245 000 €",
        items: [
          "São Paulo, Buenos Aires, Bogotá",
          "72 véhicules partners",
          "Mototaxis LATAM actifs",
          "App iOS/Android bilingue",
          "Régie pub locale intégrée",
        ],
      },
      {
        year: "An 3",
        phase: "Croissance continentale",
        gmv: "880 000 €",
        items: [
          "12+ métropoles, 220 véhicules",
          "Passage Corp structure",
          "Campagnes multi-pays",
          "Partenariat marques FMCG",
          "GPS tracking temps réel",
        ],
      },
      {
        year: "An 4–5",
        phase: "Leader OOH mobile Amériques",
        gmv: "4 100 000 €",
        items: [
          "25+ villes, 455–760 véhicules",
          "Offre grands groupes US",
          "DOOH mobile certifié Nielsen",
          "Marketplace panAméricaine",
          "Potentiel Series A",
        ],
      },
    ],
  },
  moyen_orient: {
    label: "Moyen-Orient",
    flag: "",
    marcheTaille: "2,5 Mds $",
    marcheSegment: "280 M€",
    marcheCroissance: "+28 %",
    marcheDesc: [
      "Le marché OOH au Moyen-Orient représente 2,5 milliards $ (+14 %/an). Les métropoles ultra-connectées comme Dubaï, Riyad, Doha et Abu Dhabi concentrent une densité de flux publicitaire parmi les plus élevées au monde, avec une audience premium et à fort pouvoir d'achat.",
      "MoveSpot adresse ce marché via les flottes de taxis haut de gamme, VTC Careem/Uber, navettes hôtelières et camions LED événementiels. Le segment publicité mobile est estimé à 280 M€ avec +28 %/an, porté par les grandes marques luxe, FMCG et tech — un marché à forte densité avec peu de concurrence directe sur le mobile OOH.",
    ],
    kpis: [
      { v: "2,5 Mds $", l: "Marché OOH Moyen-Orient", s: "+14 %/an" },
      { v: "+28 %", l: "Croissance mobile OOH", s: "Métropoles premium" },
      { v: "30 %", l: "Commission MoveSpot", s: "Sur GMV advertisers" },
      { v: "1 020 000 €", l: "CA An 5", s: "Marge nette 47 %" },
      { v: "620", l: "Véhicules An 5", s: "Démarrage : 12" },
      { v: "3 400 000 €", l: "GMV An 5", s: "70 % reversé propriétaires" },
    ],
    gmv: [32000, 180000, 720000, 1800000, 3400000],
    comm: [9600, 54000, 216000, 540000, 1020000],
    revers: [22400, 126000, 504000, 1260000, 2380000],
    charges: [5200, 14500, 88000, 215000, 390000],
    net: [2550, 29700, 103000, 257000, 481500],
    treso: [2550, 32250, 135250, 392250, 873750],
    vehicules: [12, 50, 160, 340, 620],
    marge: [26.6, 55.0, 47.7, 47.6, 47.2],
    structure: [
      "LLC (Free Zone)",
      "LLC (Free Zone)",
      "Holding (IS)",
      "Holding (IS)",
      "Holding (IS)",
    ],
    urssaf: [1600, 8000, 0, 0, 0],
    vl: [250, 1800, 0, 0, 0],
    is: [0, 0, 25000, 68000, 148500],
    fiscalLabels: {
      urssaf: "Cotisations sociales LLC Free Zone (An 1-2)",
      vl: "Taxe locale libératoire (An 1-2)",
      is: "Corporate tax UAE/KSA (9–20 % — An 3-5)",
      note: "Hypothèses : commission stable à 30 % du GMV. Moyenne 2 300 €/véhicule/mois. Structure LLC Free Zone dès An 1 (Dubaï). Passage Holding à partir de l'An 3. Apport initial nul.",
    },
    roadmap: [
      {
        year: "An 1",
        phase: "Pilot Dubaï / Riyad",
        gmv: "32 000 €",
        items: [
          "Dubaï & Riyad pilotes",
          "12 taxis premium + VTC",
          "10 advertisers luxe & FMCG",
          "Stripe + Apple Pay UAE",
          "Partenaires covering locaux",
        ],
      },
      {
        year: "An 2",
        phase: "Expansion Golfe",
        gmv: "180 000 €",
        items: [
          "Doha, Abu Dhabi, Kuwait City",
          "50 véhicules partners",
          "Camions LED événementiels",
          "App multilingue (AR/EN/FR)",
          "API annonceurs grands groupes",
        ],
      },
      {
        year: "An 3",
        phase: "Déploiement régional",
        gmv: "720 000 €",
        items: [
          "8+ métropoles, 160 véhicules",
          "Passage Holding (IS)",
          "Campagnes cross-pays Golfe",
          "Partenariat réseaux OOH locaux",
          "Analytics GPS adapté région",
        ],
      },
      {
        year: "An 4–5",
        phase: "Leader mobile OOH Golfe",
        gmv: "3 400 000 €",
        items: [
          "15+ villes, 340–620 véhicules",
          "Offre grands comptes (NEOM, Expo)",
          "DOOH mobile certifié",
          "Plateforme SaaS white-label",
          "Expansion Levant & Maghreb",
        ],
      },
    ],
  },
};

// ─── Données prévisionnel ─────────────────────────────────────────────────────

const YEARS = ["An 1", "An 2", "An 3", "An 4", "An 5"];

const fmt = (n: number | string, lang: string) =>
  new Intl.NumberFormat(lang, { maximumFractionDigits: 0 }).format(Number(n)) + " €";

// ─── Composant principal ───────────────────────────────────────────────────────

type Tab = "marche" | "catalogue" | "previsionnel";

function EtudeMarche() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>("marche");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region>("europe");
  const d = REGION_DATA[selectedRegion];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border backdrop-blur sticky top-0 z-10 light-band">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <nav className="flex items-center gap-2">
            <Link
              to="/advertiser/"
              className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full hover:bg-secondary"
            >
              {t("advertiser.etude_marche.back")}
            </Link>
            <Link
              to="/advertiser/briefs/nouveau"
              className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition"
            >
              {t("advertiser.etude_marche.new_brief_btn")}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-6 py-10">
        {/* En-tête */}
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold mb-2">
            {t("advertiser.etude_marche.title")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {t("advertiser.etude_marche.subtitle")}
          </p>
        </div>

        {/* Sélecteur Marché cible */}
        <div className="mb-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Marché cible
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(REGION_DATA) as Region[]).map((r) => {
              const rd = REGION_DATA[r];
              return (
                <button
                  key={r}
                  onClick={() => setSelectedRegion(r)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition",
                    selectedRegion === r
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {rd.flag && <span>{rd.flag}</span>}
                  <span>{rd.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI top */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {d.kpis.map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-card p-4">
              <div className="font-display text-xl font-bold text-primary tabular-nums">{k.v}</div>
              <div className="text-xs font-medium mt-0.5 text-foreground">{k.l}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.s}</div>
            </div>
          ))}
        </div>
        {/* Onglets */}
        <div className="flex gap-1 mb-6 border border-border rounded-xl p-1 bg-card/50 w-fit">
          {(["marche", "catalogue", "previsionnel"] as Tab[]).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => setTab(tabKey)}
              className={cn(
                "px-5 py-2 rounded-lg text-sm font-medium transition",
                tab === tabKey
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tabKey === "marche"
                ? t("advertiser.etude_marche.tab_marche")
                : tabKey === "catalogue"
                  ? t("advertiser.etude_marche.tab_catalogue")
                  : t("advertiser.etude_marche.tab_previsionnel")}
            </button>
          ))}
        </div>

        {/* ══ ONGLET 1 — MARCHÉ & STRATÉGIE ════════════════════════════════════ */}
        {tab === "marche" && (
          <div className="space-y-6">
            {/* Contexte marché */}
            <div className="grid md:grid-cols-2 gap-5">
              <Card title={`Le marché Out-of-Home — ${d.flag} ${d.label}`}>
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">
                    Marché total : {d.marcheTaille}
                  </span>
                  <span className="text-xs font-semibold bg-green-500/10 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                    Segment mobile : {d.marcheSegment}
                  </span>
                  <span className="text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full">
                    Croissance : {d.marcheCroissance}
                  </span>
                </div>
                {d.marcheDesc.map((para, i) => (
                  <p key={i} className={`text-sm text-muted-foreground ${i > 0 ? "mt-2" : ""}`}>
                    {para}
                  </p>
                ))}
              </Card>
              <Card title="Segments advertisers">
                <div className="space-y-1.5">
                  {[
                    {
                      s: "Commerce local / restauration",
                      f: "Taxi, van",
                      b: "200–800 €/mois",
                      p: 30,
                    },
                    {
                      s: "Retail & franchise",
                      f: "Van, food truck",
                      b: "1 000–5 000 €/mois",
                      p: 25,
                    },
                    {
                      s: "Événement & festival",
                      f: "Tutuk, vélo cargo",
                      b: "500–3 000 €/événement",
                      p: 20,
                    },
                    {
                      s: "Startup / app mobile",
                      f: "Scooter, taxi",
                      b: "1 500–8 000 €/mois",
                      p: 15,
                    },
                    { s: "Grande marque", f: "Flotte multi-formats", b: "10 000 €+/mois", p: 10 },
                  ].map((seg) => (
                    <div
                      key={seg.s}
                      className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{seg.s}</div>
                        <div className="text-xs text-muted-foreground">{seg.f}</div>
                      </div>
                      <div className="text-xs font-semibold text-primary whitespace-nowrap">
                        {seg.b}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Benchmark CPM */}
            <Card title="Benchmark CPM — MoveSpot vs autres médias (€ / 1 000 impressions)">
              <p className="text-xs text-muted-foreground mb-4">
                MoveSpot positionne un CPM mesurable et ciblé, compétitif face aux canaux
                classiques.
              </p>
              <div className="space-y-2.5">
                {[
                  { label: "Affichage statique 4×3", cpm: 2.5, highlight: false },
                  { label: "Google Display", cpm: 3.5, highlight: false },
                  { label: "Radio locale", cpm: 5, highlight: false },
                  { label: "Meta Ads", cpm: 8, highlight: false },
                  { label: "MoveSpot — Van / Taxi", cpm: 12, highlight: true },
                  { label: "MoveSpot — Tutuk", cpm: 14, highlight: true },
                  { label: "DOOH fixe (partagé)", cpm: 22, highlight: false },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div
                      className={cn(
                        "text-xs w-44 shrink-0",
                        b.highlight ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {b.label}
                    </div>
                    <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full flex items-center justify-end pr-2 transition-all",
                          b.highlight ? "bg-primary" : "bg-border",
                        )}
                        style={{ width: `${Math.min((b.cpm / 24) * 100, 100)}%` }}
                      >
                        {b.cpm >= 8 && (
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              b.highlight ? "text-primary-foreground" : "text-muted-foreground",
                            )}
                          >
                            {b.cpm} €
                          </span>
                        )}
                      </div>
                    </div>
                    {b.cpm < 8 && (
                      <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                        {b.cpm} €
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* 5 rôles utilisateurs */}
            <Card title="Les 5 profils utilisateurs MoveSpot">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  {
                    icon: "🎯",
                    role: "Annonceur",
                    desc: "PME, retail, startups. Crée des briefs, choisit les véhicules, paie via portefeuille Stripe. Suit sa campagne en direct.",
                    tag: "Budget 200–10 000 €/mois",
                    tagCls: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
                  },
                  {
                    icon: "🚐",
                    role: "Propriétaire",
                    desc: "Gérant de taxis, vans, food trucks. Inscrit ses véhicules, répond aux briefs, encaisse via Stripe Connect.",
                    tag: "Revenus passifs/véhicule",
                    tagCls: "bg-primary/10 text-primary",
                  },
                  {
                    icon: "🗺️",
                    role: "Chauffeur",
                    desc: "Conduit le véhicule équipé. Valide l'installation avec photos + GPS depuis son espace.",
                    tag: "Suivi photos + GPS",
                    tagCls: "bg-green-500/10 text-green-600 dark:text-green-400",
                  },
                  {
                    icon: "🎨",
                    role: "Prestataire",
                    desc: "Artisan du covering et de l'habillage véhicule. Gère son portfolio et ses abonnements sur MoveSpot.",
                    tag: "Abonnement mensuel",
                    tagCls: "bg-primary/10 text-primary dark:text-primary",
                  },
                  {
                    icon: "🤝",
                    role: "Partenaire",
                    desc: "Apporteur d'affaires, partner territorial. Tableau de bord réseau et suivi des commissions.",
                    tag: "Commission réseau",
                    tagCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  },
                ].map((p) => (
                  <div key={p.role} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="text-2xl mb-2">{p.icon}</div>
                    <div className="font-semibold text-sm mb-1">{p.role}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.desc}</p>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", p.tagCls)}>
                      {p.tag}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Modèle économique */}
            <Card title="Modèle économique — Flux Stripe Connect">
              <p className="text-sm text-muted-foreground mb-4">
                Mandat d'encaissement : MoveSpot encaisse le GMV et reverse automatiquement 70 % aux
                propriétaires. Seule la commission de 30 % constitue le CA de MoveSpot.
              </p>
              <div className="flex flex-col sm:flex-row items-stretch gap-0 mb-4">
                {[
                  {
                    label: "Annonceur paie",
                    value: "100 %",
                    sub: "GMV · via Stripe",
                    color:
                      "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400",
                  },
                  {
                    label: "MoveSpot retient",
                    value: "30 %",
                    sub: "Commission = CA réel",
                    color: "bg-primary/10 border-primary/30 text-primary",
                  },
                  {
                    label: "Propriétaire reçoit",
                    value: "70 %",
                    sub: "Reversement auto.",
                    color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400",
                  },
                ].map((f, i) => (
                  <div key={f.label} className="flex items-center">
                    <div className={cn("flex-1 border rounded-xl p-4 text-center", f.color)}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">
                        {f.label}
                      </div>
                      <div className="font-display text-2xl font-bold">{f.value}</div>
                      <div className="text-xs mt-1 opacity-70">{f.sub}</div>
                    </div>
                    {i < 2 && (
                      <div className="text-muted-foreground px-3 text-lg shrink-0 hidden sm:block">
                        →
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Tableau concurrentiel */}
            <Card title="Avantages concurrentiels">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Critère
                      </th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                        Affichage statique
                      </th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                        DOOH fixe
                      </th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                        Régie mobile trad.
                      </th>
                      <th className="py-2 px-3 text-xs font-semibold text-primary text-center">
                        MoveSpot
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        c: "Ciblage géographique",
                        a: "❌ Emplacement fixe",
                        b: "⚠️ Zone large",
                        d: "⚠️ Approximatif",
                        e: "✅ Polygone précis",
                      },
                      {
                        c: "Mesure d'impressions",
                        a: "❌ Estimation panel",
                        b: "⚠️ Capteurs ponctuels",
                        d: "❌ Non",
                        e: "✅ GPS temps réel",
                      },
                      {
                        c: "Activation rapide",
                        a: "❌ 4–8 semaines",
                        b: "❌ 4–6 semaines",
                        d: "⚠️ 2–3 semaines",
                        e: "✅ < 7 jours",
                      },
                      {
                        c: "Preuve de diffusion",
                        a: "❌ Non",
                        b: "⚠️ Partielle",
                        d: "❌ Non",
                        e: "✅ Photos + tracé GPS",
                      },
                      {
                        c: "Self-service brief",
                        a: "❌ Non",
                        b: "❌ Non",
                        d: "❌ Non",
                        e: "✅ En ligne 24h/24",
                      },
                      {
                        c: "Formats éco-responsables",
                        a: "❌ Non",
                        b: "❌ Non",
                        d: "⚠️ Partiel",
                        e: "✅ Vélo, tutuk élec.",
                      },
                    ].map((row) => (
                      <tr
                        key={row.c}
                        className="border-b border-border/50 hover:bg-secondary/20 transition"
                      >
                        <td className="py-2.5 px-3 font-medium text-sm">{row.c}</td>
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                          {row.a}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                          {row.b}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                          {row.d}
                        </td>
                        <td className="py-2.5 px-3 text-center text-xs font-semibold text-primary">
                          {row.e}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pourquoi le mobile */}
            <Card title="Pourquoi choisir la publicité mobile ?">
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: "📍",
                    t: "Ciblage géo précis",
                    d: "Zone de diffusion personnalisée par polygone — quartier, arrondissement, rayon autour d'un point.",
                  },
                  {
                    icon: "📊",
                    t: "Mesure en temps réel",
                    d: "Comptage d'impressions GPS, photos d'installation, tableau de bord de suivi en direct.",
                  },
                  {
                    icon: "⚡",
                    t: "Activation rapide",
                    d: "Brief validé en 24–72 h. Campagne en ligne sous 7 jours. Pas de délai de production panneaux.",
                  },
                  {
                    icon: "🎯",
                    t: "Audience qualifiée",
                    d: "Touche les passants et riverains dans la zone de chalandise exacte de l'advertiser.",
                  },
                  {
                    icon: "🔁",
                    t: "Contenu flexible",
                    d: "Changement de créatif entre campagnes. Adaptation rapide du message selon l'actualité.",
                  },
                  {
                    icon: "🌱",
                    t: "Image éco-responsable",
                    d: "Vélo cargo, triporteur, tutuk électrique — formats zéro émission pour marques RSE.",
                  },
                ].map((a) => (
                  <div key={a.t} className="bg-secondary/30 rounded-xl p-4">
                    <div className="text-2xl mb-2">{a.icon}</div>
                    <div className="font-semibold text-sm mb-1">{a.t}</div>
                    <div className="text-xs text-muted-foreground">{a.d}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ ONGLET 2 — CATALOGUE SUPPORTS ════════════════════════════════════ */}
        {tab === "catalogue" && (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
              <strong>10 formats de supports disponibles</strong> — du taxi au tutuk en passant par
              les vélos cargo. Cliquez sur un format pour voir le détail et créer un brief.
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {CATALOGUE.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setSelectedVehicle(selectedVehicle?.key === v.key ? null : v)}
                  className={cn(
                    "text-left rounded-2xl border p-4 transition-all",
                    selectedVehicle?.key === v.key
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{v.emoji}</span>
                    {v.demandePct > 0 && (
                      <span
                        className={cn(
                          "text-xs font-semibold px-2 py-0.5 rounded-full",
                          v.demandePct >= 20
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {v.demandePct >= 20 ? "⭐ Top" : `${v.demandePct} %`}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{v.label}</h3>
                  <div className="text-xs text-muted-foreground mb-3">
                    {v.formats.slice(0, 2).join(" · ")}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">
                      {v.prixMin}–{v.prixMax} €/j
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(v.impressionsMax / 1000).toFixed(1)}k imp./j
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Détail sélectionné */}
            {selectedVehicle && (
              <div className="rounded-2xl border border-primary bg-card p-6 shadow-lg">
                <div className="flex items-start gap-4 mb-5">
                  <span className="text-5xl">{selectedVehicle.emoji}</span>
                  <div>
                    <h2 className="font-display text-2xl font-bold">{selectedVehicle.label}</h2>
                    <p className="text-muted-foreground text-sm mt-1">{selectedVehicle.atout}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {[
                    {
                      l: t("advertiser.etude_marche.detail_prix_jour"),
                      v: `${selectedVehicle.prixMin}–${selectedVehicle.prixMax} €`,
                    },
                    {
                      l: t("advertiser.etude_marche.detail_impressions_jour"),
                      v: `${selectedVehicle.impressionsMin.toLocaleString(i18n.language)}–${selectedVehicle.impressionsMax.toLocaleString(i18n.language)}`,
                    },
                    {
                      l: t("advertiser.etude_marche.detail_demande"),
                      v:
                        selectedVehicle.demandePct > 0
                          ? `${selectedVehicle.demandePct} %`
                          : t("advertiser.etude_marche.detail_demande_available"),
                    },
                    {
                      l: t("advertiser.etude_marche.detail_zones"),
                      v: getZones(selectedVehicle.key, selectedRegion).slice(0, 2).join(", "),
                    },
                  ].map((s) => (
                    <div key={s.l} className="bg-secondary/40 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">{s.l}</div>
                      <div className="font-semibold text-sm">{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {t("advertiser.etude_marche.detail_formats_title")}
                    </h4>
                    <ul className="space-y-1">
                      {selectedVehicle.formats.map((f) => (
                        <li
                          key={f}
                          className="text-sm text-muted-foreground flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      {t("advertiser.etude_marche.detail_zones_title")}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getZones(selectedVehicle.key, selectedRegion).map((z) => (
                        <span key={z} className="text-xs bg-secondary px-2.5 py-1 rounded-full">
                          {z}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Link
                    to="/advertiser/briefs/nouveau"
                    className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
                  >
                    {t("advertiser.etude_marche.detail_create_brief", {
                      label: selectedVehicle.label,
                    })}
                  </Link>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-secondary transition"
                  >
                    {t("advertiser.etude_marche.detail_close")}
                  </button>
                </div>
              </div>
            )}

            {/* Tableau comparatif */}
            <Card title="Tableau comparatif — tous les supports">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      {[
                        t("advertiser.etude_marche.col_support"),
                        t("advertiser.etude_marche.col_formats"),
                        t("advertiser.etude_marche.col_prix_j"),
                        t("advertiser.etude_marche.col_impressions_j"),
                        t("advertiser.etude_marche.col_cpm_est"),
                        t("advertiser.etude_marche.col_zones"),
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap first:pl-4"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATALOGUE.map((v, i) => {
                      const prixMid = (v.prixMin + v.prixMax) / 2;
                      const impMid = (v.impressionsMin + v.impressionsMax) / 2;
                      const cpm = ((prixMid / impMid) * 1000).toFixed(1);
                      return (
                        <tr
                          key={v.key}
                          className={cn(
                            "border-b border-border/50 hover:bg-secondary/20 transition",
                            i % 2 === 1 && "bg-secondary/10",
                          )}
                        >
                          <td className="py-2.5 pl-4 pr-3 font-medium">
                            {v.emoji} {v.label}
                            {v.demandePct >= 20 && (
                              <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                ⭐
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">
                            {v.formats[0]}
                          </td>
                          <td className="py-2.5 px-3 text-primary font-semibold tabular-nums whitespace-nowrap">
                            {v.prixMin}–{v.prixMax} €
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs tabular-nums whitespace-nowrap">
                            {v.impressionsMin.toLocaleString(i18n.language)}–
                            {v.impressionsMax.toLocaleString(i18n.language)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs tabular-nums">{cpm} €</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">
                            {getZones(v.key, selectedRegion)[0]}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                CPM = Coût Pour Mille impressions. Calculé sur les valeurs moyennes. Indicatif.
              </p>
            </Card>

            {/* Demande par type */}
            <Card title="Demande advertisers par type de support">
              <div className="space-y-2.5">
                {CATALOGUE.filter((v) => v.demandePct > 0)
                  .sort((a, b) => b.demandePct - a.demandePct)
                  .map((v) => (
                    <div key={v.key} className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 w-36 shrink-0 text-sm">
                        <span>{v.emoji}</span>
                        <span className="text-xs text-muted-foreground truncate">{v.label}</span>
                      </div>
                      <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden relative">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/80 rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${v.demandePct}%` }}
                        >
                          {v.demandePct >= 10 && (
                            <span className="text-xs font-bold text-primary-foreground">
                              {v.demandePct} %
                            </span>
                          )}
                        </div>
                        {v.demandePct < 10 && (
                          <span className="absolute right-2 inset-y-0 flex items-center text-xs text-muted-foreground">
                            {v.demandePct} %
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        )}

        {/* ══ ONGLET 3 — PRÉVISIONNEL 5 ANS ════════════════════════════════════ */}
        {tab === "previsionnel" && (
          <div className="space-y-6">
            {/* Chart GMV */}
            <Card title="Volume d'affaires — GMV total vs Commission MoveSpot">
              <p className="text-xs text-muted-foreground mb-4">
                Commission MoveSpot (30 %, en bleu) + reversement propriétaires (70 %, en gris) =
                GMV total facturé aux advertisers.
              </p>
              <div className="space-y-3">
                {YEARS.map((y, i) => (
                  <div key={y} className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-muted-foreground w-8 shrink-0">
                      {y}
                    </div>
                    <div className="flex-1 h-7 bg-secondary/40 rounded-lg overflow-hidden flex">
                      <div
                        className="h-full bg-primary rounded-l-lg"
                        style={{ width: `${(d.comm[i] / d.gmv[4]) * 100}%` }}
                      />
                      <div
                        className="h-full bg-border"
                        style={{ width: `${(d.revers[i] / d.gmv[4]) * 100}%`, marginLeft: 2 }}
                      />
                    </div>
                    <div className="text-xs tabular-nums font-semibold text-foreground w-24 text-right shrink-0">
                      {fmt(d.gmv[i], i18n.language)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-primary shrink-0" />
                  {t("advertiser.etude_marche.previsionnel_gmv_legend_commission")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-border shrink-0" />
                  {t("advertiser.etude_marche.previsionnel_gmv_legend_revers")}
                </span>
              </div>
            </Card>

            {/* Chart résultat net */}
            <Card title="Résultat net annuel (€ après charges et impôts)">
              <div className="space-y-3">
                {YEARS.map((y, i) => (
                  <div key={y} className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-muted-foreground w-8 shrink-0">
                      {y}
                    </div>
                    <div className="flex-1 h-6 bg-secondary/40 rounded-lg overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-lg flex items-center justify-end pr-2"
                        style={{ width: `${(d.net[i] / d.net[4]) * 100}%` }}
                      >
                        {d.net[i] > 50000 && (
                          <span className="text-xs font-semibold text-white tabular-nums">
                            {fmt(d.net[i], i18n.language)}
                          </span>
                        )}
                      </div>
                    </div>
                    {d.net[i] <= 50000 && (
                      <div className="text-xs tabular-nums font-semibold text-green-600 dark:text-green-400 w-24 text-right shrink-0">
                        {fmt(d.net[i], i18n.language)}
                      </div>
                    )}
                    {d.net[i] > 50000 && <div className="w-24 shrink-0" />}
                  </div>
                ))}
              </div>
            </Card>

            {/* Tableau prévisionnel complet */}
            <Card title="Prévisionnel financier détaillé — 5 ans">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-primary text-primary-foreground">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold">Indicateur</th>
                      {YEARS.map((y) => (
                        <th
                          key={y}
                          className="text-right py-2.5 px-3 text-xs font-semibold tabular-nums whitespace-nowrap"
                        >
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <SectionRow label="Structure & volume" />
                    <DataRow
                      label="Régime juridique"
                      values={d.structure}
                      format={(v) => String(v)}
                    />
                    <DataRow
                      label="Véhicules partners"
                      values={d.vehicules}
                      format={(v) => String(v)}
                    />
                    <SectionRow label="Flux financiers" />
                    <DataRow
                      label="GMV — facturé aux advertisers"
                      values={d.gmv}
                      format={(v) => fmt(v, i18n.language)}
                    />
                    <DataRow
                      label="Reversé propriétaires (70 %)"
                      values={d.revers}
                      format={(v) => fmt(v, i18n.language)}
                    />
                    <DataRow
                      label="Commission MoveSpot = CA (30 %)"
                      values={d.comm}
                      format={(v) => fmt(v, i18n.language)}
                      bold
                    />
                    <SectionRow label="Charges & fiscalité" />
                    <DataRow
                      label="Charges d'exploitation"
                      values={d.charges}
                      format={(v) => fmt(v, i18n.language)}
                    />
                    <DataRow
                      label={d.fiscalLabels.urssaf}
                      values={d.urssaf}
                      format={(v) => (v === 0 ? "—" : fmt(v, i18n.language))}
                    />
                    <DataRow
                      label={d.fiscalLabels.vl}
                      values={d.vl}
                      format={(v) => (v === 0 ? "—" : fmt(v, i18n.language))}
                    />
                    <DataRow
                      label={d.fiscalLabels.is}
                      values={d.is}
                      format={(v) => (v === 0 ? "—" : fmt(v, i18n.language))}
                    />
                    <tr className="border-t-2 border-border bg-secondary/30">
                      <td className="py-2.5 px-3 font-bold text-foreground">
                        Résultat net (cash après impôts)
                      </td>
                      {d.net.map((v, i) => (
                        <td
                          key={i}
                          className="py-2.5 px-3 text-right font-bold tabular-nums text-green-600 dark:text-green-400 whitespace-nowrap"
                        >
                          {fmt(v, i18n.language)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        Marge nette / CA
                      </td>
                      {d.marge.map((v, i) => (
                        <td
                          key={i}
                          className="py-2.5 px-3 text-right font-semibold tabular-nums text-foreground"
                        >
                          {v} %
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        Trésorerie cumulée fin de période
                      </td>
                      {d.treso.map((v, i) => (
                        <td
                          key={i}
                          className="py-2.5 px-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap"
                        >
                          {fmt(v, i18n.language)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Hypothèses :</strong> {d.fiscalLabels.note}
              </p>
            </Card>

            {/* Simulateur ROI */}
            <SimulateurROI />

            {/* Feuille de route */}
            <Card title={`Feuille de route — 4 phases (${d.flag} ${d.label})`}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {d.roadmap.map((p) => (
                  <div key={p.year} className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-3 flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-foreground bg-primary px-2.5 py-1 rounded-full shrink-0">
                        {p.year}
                      </span>
                      <span className="text-sm font-semibold">{p.phase}</span>
                    </div>
                    <div className="p-4">
                      <ul className="space-y-1.5">
                        {p.items.map((it) => (
                          <li key={it} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-primary shrink-0">→</span>
                            {it}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="font-display text-lg font-bold text-primary tabular-nums">
                          {p.gmv}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t("advertiser.etude_marche.roadmap_gmv_label")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Appel à l'action */}
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-8 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">
                {t("advertiser.etude_marche.cta_title")}
              </h2>
              <p className="text-muted-foreground mb-6">{t("advertiser.etude_marche.cta_desc")}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link
                  to="/advertiser/briefs/nouveau"
                  className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition"
                >
                  {t("advertiser.etude_marche.cta_create")}
                </Link>
                <Link
                  to="/"
                  hash="spots"
                  className="rounded-full border border-primary/40 text-primary px-8 py-3 font-semibold hover:bg-primary/10 transition"
                >
                  {t("advertiser.etude_marche.cta_browse")}
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Composants utilitaires ────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-display text-lg font-bold">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr className="bg-secondary/30">
      <td
        colSpan={6}
        className="py-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  label,
  values,
  format,
  bold,
}: {
  label: string;
  values: (number | string)[];
  format: (v: number | string) => string;
  bold?: boolean;
}) {
  return (
    <tr className="border-b border-border/50 hover:bg-secondary/10 transition">
      <td
        className={cn(
          "py-2 px-3 text-sm",
          bold ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </td>
      {values.map((v, i) => (
        <td
          key={i}
          className={cn(
            "py-2 px-3 text-right text-sm tabular-nums whitespace-nowrap",
            bold ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {format(v)}
        </td>
      ))}
    </tr>
  );
}

// ─── Simulateur ROI ────────────────────────────────────────────────────────────

function SimulateurROI() {
  const { t, i18n } = useTranslation();
  const [jours, setJours] = useState(30);
  const [vehicules, setVehicules] = useState(5);
  const [prixJour, setPrixJour] = useState(30);
  const [typeV, setTypeV] = useState<VehicleEntry>(CATALOGUE[0]);

  const budget = jours * vehicules * prixJour;
  const impMid = (typeV.impressionsMin + typeV.impressionsMax) / 2;
  const impressions = Math.round(jours * vehicules * impMid);
  const cpm = budget > 0 && impressions > 0 ? ((budget / impressions) * 1000).toFixed(2) : "—";

  return (
    <Card title={t("advertiser.etude_marche.sim_title")}>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="sim-vehicle-type" className="text-sm font-medium block mb-2">
              {t("advertiser.etude_marche.sim_vehicle_label")}
            </label>
            <select
              id="sim-vehicle-type"
              value={typeV.key}
              onChange={(e) => {
                const v = CATALOGUE.find((c) => c.key === e.target.value);
                if (v) {
                  setTypeV(v);
                  setPrixJour(Math.round((v.prixMin + v.prixMax) / 2));
                }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATALOGUE.map((v) => (
                <option key={v.key} value={v.key}>
                  {v.emoji} {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sim-jours" className="text-sm font-medium block mb-2">
              {t("advertiser.etude_marche.sim_jours_label", { n: jours })}
            </label>
            <input
              id="sim-jours"
              type="range"
              min={1}
              max={180}
              value={jours}
              aria-valuetext={`${jours} jours`}
              onChange={(e) => setJours(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1 j</span>
              <span>180 j</span>
            </div>
          </div>
          <div>
            <label htmlFor="sim-vehicules" className="text-sm font-medium block mb-2">
              {t("advertiser.etude_marche.sim_vehicules_label")} :{" "}
              <span className="text-primary font-bold">{vehicules}</span>
            </label>
            <input
              id="sim-vehicules"
              type="range"
              min={1}
              max={50}
              value={vehicules}
              aria-valuetext={`${vehicules} véhicule${vehicules > 1 ? "s" : ""}`}
              onChange={(e) => setVehicules(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1</span>
              <span>50</span>
            </div>
          </div>
          <div>
            <label htmlFor="sim-prix" className="text-sm font-medium block mb-2">
              {t("advertiser.etude_marche.sim_prix_label")} :{" "}
              <span className="text-primary font-bold">{prixJour} €</span>
              <span className="text-xs text-muted-foreground ml-2">
                ({typeV.prixMin}–{typeV.prixMax} €)
              </span>
            </label>
            <input
              id="sim-prix"
              type="range"
              min={typeV.prixMin}
              max={typeV.prixMax}
              value={prixJour}
              aria-valuetext={`${prixJour} € par jour`}
              onChange={(e) => setPrixJour(Number(e.target.value))}
              className="w-full accent-primary"
            />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 text-center">
            <div className="font-display text-4xl font-bold text-primary mb-1 tabular-nums">
              {budget.toLocaleString(i18n.language)} €
            </div>
            <div className="text-sm text-muted-foreground">
              {t("advertiser.etude_marche.sim_budget_label")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-xl font-bold tabular-nums">
                {impressions.toLocaleString(i18n.language)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t("advertiser.etude_marche.sim_impressions_label")}
              </div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-xl font-bold font-mono tabular-nums">{cpm} €</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {t("advertiser.etude_marche.sim_cpm_label")}
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3">
            <strong>
              {typeV.emoji} {typeV.label}
            </strong>{" "}
            — {typeV.atout}
          </div>
          <Link
            to="/advertiser/briefs/nouveau"
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition text-center"
          >
            {t("advertiser.etude_marche.sim_create_brief")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
