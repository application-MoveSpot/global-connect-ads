import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/annonceur/exemples")({
  head: () => ({
    meta: [
      { title: "Exemples de campagnes particuliers — MoveSpot" },
      {
        name: "description",
        content:
          "Découvrez comment des particuliers utilisent MoveSpot pour promouvoir mariages, ouvertures de commerce, associations et événements locaux.",
      },
    ],
  }),
  component: ExemplesPage,
});

type EventType = "all" | "mariage" | "ouverture" | "association" | "festival" | "culturel" | "inauguration";

type Example = {
  id: number;
  type: Exclude<EventType, "all">;
  icon: string;
  label: string;
  city: string;
  advertiser: string;
  title: string;
  excerpt: string;
  vehicleLabel: string;
  vehicleIcon: string;
  days: number;
  date: string;
  result: string;
};

const EXAMPLES: Example[] = [
  {
    id: 1,
    type: "mariage",
    icon: "💍",
    label: "Mariage",
    city: "Lyon",
    advertiser: "Un particulier de Lyon",
    title: "Mariage Julie & Thomas — 3e arrondissement",
    excerpt:
      "Nous nous marions le 14 juin et voulions prévenir amis et famille dans le 3e et 6e arrondissement. Visuels sobres fond blanc avec nos prénoms et la date.",
    vehicleLabel: "2 voitures",
    vehicleIcon: "🚗",
    days: 7,
    date: "Juin 2026",
    result: "2 véhicules · ~8 000 passages · diffusé 7 jours",
  },
  {
    id: 2,
    type: "ouverture",
    icon: "🏪",
    label: "Ouverture commerce",
    city: "Bordeaux",
    advertiser: "Un particulier de Bordeaux",
    title: "Ouverture La Petite Épicerie Bio — Saint-Michel",
    excerpt:
      "Inauguration le 1er mars de notre épicerie bio de quartier. Nous voulions toucher les habitants de Saint-Michel et Saint-Pierre avant l'ouverture.",
    vehicleLabel: "1 van",
    vehicleIcon: "🚐",
    days: 14,
    date: "Mars 2026",
    result: "1 véhicule · ~11 000 passages · diffusé 14 jours",
  },
  {
    id: 3,
    type: "association",
    icon: "🤝",
    label: "Association",
    city: "Nantes",
    advertiser: "Une association de Nantes",
    title: "Appel aux bénévoles — Les Restos du Cœur 44",
    excerpt:
      "Campagne de recrutement de bénévoles pour la saison hivernale. Nous cherchions à toucher les habitants du centre-ville et de l'Île de Nantes.",
    vehicleLabel: "2 vélos cargo",
    vehicleIcon: "🚲",
    days: 14,
    date: "Octobre 2025",
    result: "2 véhicules · 47 nouvelles candidatures reçues",
  },
  {
    id: 4,
    type: "festival",
    icon: "🎪",
    label: "Festival",
    city: "Toulouse",
    advertiser: "Un collectif de Toulouse",
    title: "Marché artisanal de Noël — Place du Capitole",
    excerpt:
      "Marché artisanal de 3 jours avec 40 exposants locaux. Nous voulions une visibilité maximale autour du Capitole le week-end de lancement.",
    vehicleLabel: "3 food trucks",
    vehicleIcon: "🚚",
    days: 3,
    date: "Décembre 2025",
    result: "3 véhicules · week-end · affluence record",
  },
  {
    id: 5,
    type: "culturel",
    icon: "🎭",
    label: "Événement culturel",
    city: "Paris",
    advertiser: "Un particulier de Paris",
    title: "Vernissage Galerie Oberkampf — Exposition Lumière",
    excerpt:
      "Vernissage d'une exposition photographique de 10 artistes émergents. Ciblage du 11e et 10e arrondissement, public CSP+, 25-45 ans.",
    vehicleLabel: "1 taxi",
    vehicleIcon: "🚕",
    days: 7,
    date: "Avril 2026",
    result: "1 véhicule · ~5 000 passages · 200 visiteurs",
  },
  {
    id: 6,
    type: "inauguration",
    icon: "🎗️",
    label: "Inauguration",
    city: "Lille",
    advertiser: "Un particulier de Lille",
    title: "Inauguration Studio de Yoga Zen — Vieux-Lille",
    excerpt:
      "Ouverture de mon studio de yoga dans le Vieux-Lille. Cours d'inauguration offerts pendant une semaine — je voulais que tout le quartier le sache.",
    vehicleLabel: "1 voiture",
    vehicleIcon: "🚗",
    days: 7,
    date: "Février 2026",
    result: "1 véhicule · 35 nouveaux abonnés",
  },
  {
    id: 7,
    type: "mariage",
    icon: "💍",
    label: "Mariage",
    city: "Nice",
    advertiser: "Un particulier de Nice",
    title: "Mariage Sophie & Karim — Promenade des Anglais",
    excerpt:
      "Mariage en bord de mer avec 150 invités de toute la France. Annonce dans les quartiers centraux pour prévenir amis et famille présents à Nice ce jour-là.",
    vehicleLabel: "1 taxi",
    vehicleIcon: "🚕",
    days: 3,
    date: "Juillet 2026",
    result: "1 véhicule · 3 jours · mariage réussi 🎉",
  },
  {
    id: 8,
    type: "ouverture",
    icon: "🏪",
    label: "Ouverture commerce",
    city: "Marseille",
    advertiser: "Un particulier de Marseille",
    title: "Ouverture Snack du Port — Le Panier",
    excerpt:
      "Snack méditerranéen dans le Panier. Inauguration avec dégustation gratuite. Je voulais toucher les touristes et les habitants du quartier simultanément.",
    vehicleLabel: "2 scooters",
    vehicleIcon: "🛵",
    days: 14,
    date: "Mai 2026",
    result: "2 véhicules · 14 jours · 120 couverts/jour dès l'ouverture",
  },
];

const FILTERS: { id: EventType; label: string; icon?: string }[] = [
  { id: "all", label: "Tous" },
  { id: "mariage", label: "Mariage", icon: "💍" },
  { id: "ouverture", label: "Commerce", icon: "🏪" },
  { id: "association", label: "Association", icon: "🤝" },
  { id: "festival", label: "Festival", icon: "🎪" },
  { id: "culturel", label: "Culturel", icon: "🎭" },
  { id: "inauguration", label: "Inauguration", icon: "🎗️" },
];

function ExemplesPage() {
  const [filter, setFilter] = useState<EventType>("all");

  const visible = filter === "all" ? EXAMPLES : EXAMPLES.filter((e) => e.type === filter);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link
            to="/annonceur/inscription"
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Lancer ma campagne →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Ils ont fait confiance à MoveSpot
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Des particuliers, associations et petits commerces qui ont utilisé la publicité mobile pour toucher leur quartier.
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition border ${
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              {f.icon && <span className="mr-1">{f.icon}</span>}
              {f.label}
            </button>
          ))}
        </div>

        {/* Grille d'exemples */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {visible.map((ex) => (
            <div
              key={ex.id}
              className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
            >
              {/* Badge type */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {ex.icon} {ex.label}
                </span>
                <span className="text-xs text-muted-foreground">{ex.date}</span>
              </div>

              {/* Titre */}
              <p className="font-semibold text-sm leading-snug">{ex.title}</p>

              {/* Extrait */}
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                "{ex.excerpt}"
              </p>

              {/* Métadonnées */}
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span>{ex.vehicleIcon}</span> {ex.vehicleLabel}
                </span>
                <span>·</span>
                <span>📍 {ex.city}</span>
                <span>·</span>
                <span>🗓 {ex.days} jour{ex.days > 1 ? "s" : ""}</span>
              </div>

              {/* Résultat */}
              <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 px-3 py-2">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {ex.result}
                </p>
              </div>

              {/* Annonceur anonymisé */}
              <p className="text-[10px] text-muted-foreground/60 italic">{ex.advertiser}</p>
            </div>
          ))}
        </div>

        {/* CTA bas de page */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <p className="font-display text-2xl font-bold mb-2">Prêt à lancer votre campagne ?</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Créez un brief en 5 minutes. Les propriétaires de votre zone reçoivent votre demande et vous proposent leurs véhicules.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Créer mon compte gratuit →
            </Link>
            <Link
              to="/annonceur/preview-3d"
              className="rounded-full border border-border bg-card text-foreground px-6 py-3 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Visualiser en 3D d'abord
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Dès 49 € · sans abonnement · annulation gratuite sous 72h
          </p>
        </div>
      </main>
    </div>
  );
}
