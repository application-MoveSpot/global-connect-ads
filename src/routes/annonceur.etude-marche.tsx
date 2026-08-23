import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/annonceur/etude-marche")({
  head: () => ({
    meta: [
      { title: "Étude de marché annonceurs — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: EtudeMarche,
});

// ─── Données catalogue véhicules ──────────────────────────────────────────────

type VehicleEntry = {
  key: string;
  emoji: string;
  label: string;
  formats: string[];
  prixMin: number;
  prixMax: number;
  impressionsMin: number;
  impressionsMax: number;
  demandePct: number; // part de la demande annonceurs (simulation)
  zones: string[];
  atout: string;
};

const CATALOGUE: VehicleEntry[] = [
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
    key: "sac_a_dos_lcd",
    emoji: "📺",
    label: "Sac à dos LCD (Walker)",
    formats: ["Écran LED 42\"", "Vidéo HD", "Animation dynamique"],
    prixMin: 25,
    prixMax: 60,
    impressionsMin: 1500,
    impressionsMax: 4000,
    demandePct: 18,
    zones: ["Zones piétonnes", "Marchés", "Événements", "Festivals"],
    atout: "Impact maximal, contenu dynamique, 100 % piéton",
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
    key: "sac_a_dos_affiche",
    emoji: "🎒",
    label: "Sac à dos affiche (Walker)",
    formats: ["Panneau A1 recto/verso", "Affiche plastifiée", "QR code"],
    prixMin: 10,
    prixMax: 25,
    impressionsMin: 700,
    impressionsMax: 1800,
    demandePct: 3,
    zones: ["Événements", "Manifestations", "Zones commerçantes"],
    atout: "Format événementiel agile, déploiement rapide",
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
    demandePct: 2,
    zones: ["Centres commerciaux", "Rues commerçantes", "Marchés"],
    atout: "Manœuvrabilité en zone dense",
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
];

// ─── Prévisionnel ROI annonceur ────────────────────────────────────────────────

const SCENARIOS = [
  {
    label: "Campagne courte",
    days: 7,
    vehicles: 2,
    prixJour: 25,
    impPerDay: 1200,
    badge: "Entrée de gamme",
    color: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
  },
  {
    label: "Campagne standard",
    days: 30,
    vehicles: 5,
    prixJour: 30,
    impPerDay: 1500,
    badge: "Recommandé",
    color: "bg-primary/10 border-primary/30 text-primary",
  },
  {
    label: "Campagne intensive",
    days: 90,
    vehicles: 15,
    prixJour: 35,
    impPerDay: 2000,
    badge: "Impact fort",
    color: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300",
  },
];

// ─── Composant principal ───────────────────────────────────────────────────────

function EtudeMarche() {
  const [activeTab, setActiveTab] = useState<"catalogue" | "marche" | "previsionnel">("marche");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <nav className="flex items-center gap-2">
            <Link to="/annonceur/" className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full hover:bg-secondary">
              ← Dashboard
            </Link>
            <Link to="/annonceur/briefs/nouveau" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition">
              + Nouveau brief
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Titre */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">Étude de marché & Prévisionnel</h1>
          <p className="text-muted-foreground text-lg">
            Tous les formats de véhicules publicitaires disponibles sur MoveSpot — catalogue complet, demande annonceurs et projections ROI.
          </p>
        </div>

        {/* KPIs marché */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Types de véhicules", value: "12", sub: "dans le catalogue" },
            { label: "Impressions/jour max", value: "4 000", sub: "sac à dos LCD en zone dense" },
            { label: "Prix d'entrée", value: "5 €", sub: "par véhicule par jour" },
            { label: "Portée nationale", value: "30+", sub: "villes couvertes" },
          ].map((k) => (
            <div key={k.label} className="rounded-xl border border-border bg-card p-4">
              <div className="text-2xl font-bold font-display text-primary">{k.value}</div>
              <div className="text-sm font-medium mt-0.5">{k.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-6 border border-border rounded-xl p-1 bg-card/50 w-fit">
          {(["marche", "catalogue", "previsionnel"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "marche" ? "📊 Analyse marché" : tab === "catalogue" ? "🚗 Catalogue véhicules" : "💹 Prévisionnel ROI"}
            </button>
          ))}
        </div>

        {/* ── ONGLET ANALYSE MARCHÉ ── */}
        {activeTab === "marche" && (
          <div className="space-y-8">
            {/* Contexte marché */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold mb-3">Le marché de la publicité mobile</h2>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>La publicité Out-of-Home (OOH) représente <strong className="text-foreground">7 Mds €</strong> en France et croît de 6 % par an. Le segment mobile (véhicules, walkers, vélos) est le plus dynamique avec +18 % en 2024.</p>
                  <p>MoveSpot adresse la niche du <strong className="text-foreground">DOOH de proximité</strong> : ciblage géographique précis, contenu dynamique, mesure d'impressions en temps réel.</p>
                  <p>Le <strong className="text-foreground">sac à dos LCD</strong> et le <strong className="text-foreground">tutuk</strong> sont les formats à plus forte croissance d'intérêt parmi les annonceurs digitaux.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-xl font-bold mb-3">Profils annonceurs types</h2>
                <div className="space-y-2">
                  {[
                    { segment: "Commerce local / restaurant", formats: "Van, taxi, sac à dos affiche", budget: "200–800 €/mois" },
                    { segment: "Retail & franchise", formats: "Van, food truck, voiture", budget: "1 000–5 000 €/mois" },
                    { segment: "Événement & festival", formats: "Sac à dos LCD, tutuk, vélo cargo", budget: "500–3 000 €/événement" },
                    { segment: "Startup / app mobile", formats: "Scooter, taxi, sac à dos LCD", budget: "1 500–8 000 €/mois" },
                    { segment: "Grande marque", formats: "Flotte van + taxi + walker", budget: "10 000 €+/mois" },
                  ].map((p) => (
                    <div key={p.segment} className="flex flex-col gap-0.5 py-2 border-b border-border/50 last:border-0">
                      <span className="font-medium text-sm">{p.segment}</span>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Formats : {p.formats}</span>
                        <span className="text-primary font-medium">{p.budget}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Demande par type de véhicule */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold mb-1">Demande annonceurs par type de véhicule</h2>
              <p className="text-sm text-muted-foreground mb-5">Part des briefs déposés sur MoveSpot par catégorie de véhicule (simulation basée sur les tendances du marché).</p>
              <div className="space-y-3">
                {CATALOGUE.filter((v) => v.demandePct > 0)
                  .sort((a, b) => b.demandePct - a.demandePct)
                  .map((v) => (
                    <div key={v.key} className="flex items-center gap-3">
                      <div className="w-32 text-sm flex items-center gap-1.5 shrink-0">
                        <span>{v.emoji}</span>
                        <span className="truncate text-xs">{v.label}</span>
                      </div>
                      <div className="flex-1 relative h-7 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/80 rounded-full flex items-center justify-end pr-3 transition-all duration-700"
                          style={{ width: `${v.demandePct}%` }}
                        >
                          {v.demandePct >= 8 && (
                            <span className="text-xs font-bold text-primary-foreground">{v.demandePct} %</span>
                          )}
                        </div>
                        {v.demandePct < 8 && (
                          <span className="absolute right-2 inset-y-0 flex items-center text-xs text-muted-foreground">{v.demandePct} %</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">* Les véhicules walker (sac à dos LCD/affiche) et tutuk représentent ensemble 29 % de la demande — la progression la plus rapide du catalogue.</p>
            </div>

            {/* Avantages concurrentiels par format */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold mb-4">Pourquoi le mobile surpasse l'affichage statique</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { icon: "📍", title: "Ciblage géo", desc: "Zone de diffusion personnalisée avec polygone sur carte — quartier, arrondissement, rayon autour d'un point." },
                  { icon: "📊", title: "Mesure en temps réel", desc: "Comptage d'impressions GPS, photos d'installation, tableau de bord de suivi en direct." },
                  { icon: "⚡", title: "Activation rapide", desc: "Brief validé en 24–72 h. Campagne en ligne sous 7 jours. Formats walker déployables en 48 h." },
                  { icon: "🎯", title: "Audience qualifiée", desc: "Touche les passants, riverains et clients dans la zone de chalandise exacte de l'annonceur." },
                  { icon: "🔁", title: "Contenu dynamique", desc: "Sac à dos LCD : changement de créatif à distance, programmation horaire, vidéo HD." },
                  { icon: "🌱", title: "Image verte", desc: "Vélo cargo, triporteur, walker électrique — formats zéro émission pour les marques éco-responsables." },
                ].map((a) => (
                  <div key={a.title} className="bg-secondary/30 rounded-xl p-4">
                    <div className="text-2xl mb-2">{a.icon}</div>
                    <div className="font-semibold text-sm mb-1">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{a.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ONGLET CATALOGUE VÉHICULES ── */}
        {activeTab === "catalogue" && (
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
              <strong>12 formats de véhicules disponibles</strong> — incluant les walkers (sac à dos LCD et affiche) et le tutuk. Cliquez sur un véhicule pour voir le détail.
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CATALOGUE.map((v) => (
                <button
                  key={v.key}
                  onClick={() => setSelectedVehicle(selectedVehicle?.key === v.key ? null : v)}
                  className={`text-left rounded-2xl border p-5 transition-all ${
                    selectedVehicle?.key === v.key
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/40 hover:bg-card/80"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl">{v.emoji}</div>
                    {v.demandePct > 0 && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        v.demandePct >= 20 ? "bg-primary/15 text-primary" :
                        v.demandePct >= 10 ? "bg-blue-500/15 text-blue-700 dark:text-blue-300" :
                        "bg-secondary text-muted-foreground"
                      }`}>
                        {v.demandePct >= 20 ? "Très demandé" : v.demandePct >= 10 ? "Populaire" : "Disponible"}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{v.label}</h3>
                  <div className="text-xs text-muted-foreground mb-3">{v.formats.slice(0, 2).join(" · ")}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-primary">{v.prixMin}–{v.prixMax} €/j</span>
                    <span className="text-xs text-muted-foreground">{(v.impressionsMin / 1000).toFixed(1)}k–{(v.impressionsMax / 1000).toFixed(1)}k imp./j</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Détail véhicule sélectionné */}
            {selectedVehicle && (
              <div className="rounded-2xl border border-primary bg-card p-6 shadow-lg">
                <div className="flex items-start gap-4 mb-5">
                  <div className="text-5xl">{selectedVehicle.emoji}</div>
                  <div>
                    <h2 className="font-display text-2xl font-bold">{selectedVehicle.label}</h2>
                    <p className="text-muted-foreground text-sm mt-1">{selectedVehicle.atout}</p>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  {[
                    { label: "Prix/jour/véhicule", value: `${selectedVehicle.prixMin} – ${selectedVehicle.prixMax} €` },
                    { label: "Impressions/jour", value: `${selectedVehicle.impressionsMin.toLocaleString("fr-FR")} – ${selectedVehicle.impressionsMax.toLocaleString("fr-FR")}` },
                    { label: "Demande annonceurs", value: selectedVehicle.demandePct > 0 ? `${selectedVehicle.demandePct} %` : "Disponible" },
                    { label: "Zones principales", value: selectedVehicle.zones.slice(0, 2).join(", ") },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-secondary/40 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
                      <div className="font-semibold text-sm">{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Formats publicitaires</h4>
                    <ul className="space-y-1">
                      {selectedVehicle.formats.map((f) => (
                        <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Zones de diffusion</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedVehicle.zones.map((z) => (
                        <span key={z} className="text-xs bg-secondary text-foreground px-2.5 py-1 rounded-full">{z}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-border flex gap-3">
                  <Link
                    to="/annonceur/briefs/nouveau"
                    className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition"
                  >
                    Créer un brief {selectedVehicle.label}
                  </Link>
                  <button
                    onClick={() => setSelectedVehicle(null)}
                    className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-secondary transition"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* Tableau comparatif */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5 border-b border-border">
                <h2 className="font-display text-xl font-bold">Tableau comparatif — tous les formats</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Véhicule</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Prix/j</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Impressions/j</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">CPM estimé</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Atout principal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CATALOGUE.map((v, i) => {
                      const prixMid = (v.prixMin + v.prixMax) / 2;
                      const impMid = (v.impressionsMin + v.impressionsMax) / 2;
                      const cpm = ((prixMid / impMid) * 1000).toFixed(2);
                      return (
                        <tr key={v.key} className={`border-b border-border/50 hover:bg-secondary/20 transition ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                          <td className="px-4 py-3">
                            <span className="mr-2">{v.emoji}</span>
                            <span className="font-medium">{v.label}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-primary font-medium">{v.prixMin}–{v.prixMax} €</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{v.impressionsMin.toLocaleString("fr-FR")}–{v.impressionsMax.toLocaleString("fr-FR")}</td>
                          <td className="px-4 py-3 text-right font-mono text-xs">{cpm} €</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{v.atout}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground p-4 border-t border-border/50">CPM = Coût Pour Mille impressions. Calculé sur le prix et les impressions moyens estimés. Valeurs indicatives.</p>
            </div>
          </div>
        )}

        {/* ── ONGLET PRÉVISIONNEL ROI ── */}
        {activeTab === "previsionnel" && (
          <div className="space-y-8">
            {/* Scénarios */}
            <div>
              <h2 className="font-display text-xl font-bold mb-1">Scénarios de campagne</h2>
              <p className="text-sm text-muted-foreground mb-5">Projections indicatives basées sur les tarifs moyens du catalogue.</p>
              <div className="grid md:grid-cols-3 gap-5">
                {SCENARIOS.map((s) => {
                  const budget = s.days * s.vehicles * s.prixJour;
                  const impressions = s.days * s.vehicles * s.impPerDay;
                  const cpm = (budget / (impressions / 1000)).toFixed(2);
                  return (
                    <div key={s.label} className={`rounded-2xl border p-5 ${s.color}`}>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-display text-lg font-bold">{s.label}</h3>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-current/10 opacity-80">{s.badge}</span>
                      </div>
                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex justify-between">
                          <span className="opacity-70">Durée</span>
                          <span className="font-medium">{s.days} jours</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Véhicules</span>
                          <span className="font-medium">{s.vehicles}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="opacity-70">Prix/véhicule/j</span>
                          <span className="font-medium">{s.prixJour} €</span>
                        </div>
                      </div>
                      <div className="border-t border-current/20 pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="opacity-70">Budget total</span>
                          <span className="font-bold text-lg">{budget.toLocaleString("fr-FR")} €</span>
                        </div>
                        <div className="flex justify-between text-xs opacity-70">
                          <span>Impressions totales</span>
                          <span>{impressions.toLocaleString("fr-FR")}</span>
                        </div>
                        <div className="flex justify-between text-xs opacity-70">
                          <span>CPM</span>
                          <span>{cpm} €</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Simulateur */}
            <SimulateurROI />

            {/* Benchmark CPM */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl font-bold mb-1">Benchmark CPM — MoveSpot vs autres médias</h2>
              <p className="text-sm text-muted-foreground mb-5">Coût Pour Mille impressions comparé aux canaux publicitaires classiques.</p>
              <div className="space-y-3">
                {[
                  { media: "Affichage statique 4×3", cpm: 2.5, note: "Emplacement fixe, pas de ciblage" },
                  { media: "Radio locale", cpm: 5, note: "Audience diffuse, pas de ciblage géo précis" },
                  { media: "MoveSpot — Van / Taxi", cpm: 12, note: "Ciblage géo + mesure GPS temps réel" },
                  { media: "MoveSpot — Sac à dos LCD", cpm: 16, note: "Impact visuel maximal, zones piétonnes" },
                  { media: "Google Display Network", cpm: 3.5, note: "Digital, pas de présence physique" },
                  { media: "Meta Ads (social)", cpm: 8, note: "Ciblage socio-démo, pas de présence terrain" },
                  { media: "DOOH écran digital", cpm: 22, note: "Fixe, partagé entre annonceurs" },
                ].map((b) => (
                  <div key={b.media} className="flex items-center gap-3">
                    <div className="w-48 text-sm shrink-0 text-muted-foreground">{b.media}</div>
                    <div className="flex-1 relative h-6 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 left-0 rounded-full flex items-center justify-end pr-2 ${
                          b.media.startsWith("MoveSpot") ? "bg-primary" : "bg-secondary-foreground/20"
                        }`}
                        style={{ width: `${Math.min((b.cpm / 25) * 100, 100)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right text-sm font-mono font-medium shrink-0">{b.cpm} €</div>
                    <div className="hidden md:block w-60 text-xs text-muted-foreground truncate">{b.note}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">MoveSpot offre un CPM compétitif avec une mesure de performance terrain que l'affichage statique ne permet pas.</p>
            </div>

            {/* Appel à l'action */}
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-8 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">Prêt à lancer votre campagne ?</h2>
              <p className="text-muted-foreground mb-6">Déposez un brief en quelques minutes et recevez des propositions de propriétaires sous 24–72 h.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/annonceur/briefs/nouveau" className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition">
                  Créer un brief maintenant
                </Link>
                <Link to="/" hash="spots" className="rounded-full border border-primary/40 text-primary px-8 py-3 font-semibold hover:bg-primary/10 transition">
                  Parcourir les véhicules
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Simulateur ROI interactif ─────────────────────────────────────────────────

function SimulateurROI() {
  const [jours, setJours] = useState(30);
  const [vehicules, setVehicules] = useState(5);
  const [prixJour, setPrixJour] = useState(30);
  const [typeVehicle, setTypeVehicle] = useState<VehicleEntry>(CATALOGUE[0]);

  const budget = jours * vehicules * prixJour;
  const impMid = (typeVehicle.impressionsMin + typeVehicle.impressionsMax) / 2;
  const impressions = Math.round(jours * vehicules * impMid);
  const cpm = budget > 0 && impressions > 0 ? ((budget / impressions) * 1000).toFixed(2) : "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-xl font-bold mb-1">Simulateur ROI personnalisé</h2>
      <p className="text-sm text-muted-foreground mb-5">Ajustez les paramètres pour estimer votre budget et votre portée.</p>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium block mb-2">Type de véhicule</label>
            <select
              value={typeVehicle.key}
              onChange={(e) => {
                const v = CATALOGUE.find((c) => c.key === e.target.value);
                if (v) { setTypeVehicle(v); setPrixJour(Math.round((v.prixMin + v.prixMax) / 2)); }
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATALOGUE.map((v) => (
                <option key={v.key} value={v.key}>{v.emoji} {v.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Durée de campagne : <span className="text-primary font-bold">{jours} jours</span></label>
            <input type="range" min={1} max={180} value={jours} onChange={(e) => setJours(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 j</span><span>180 j</span></div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Nombre de véhicules : <span className="text-primary font-bold">{vehicules}</span></label>
            <input type="range" min={1} max={50} value={vehicules} onChange={(e) => setVehicules(Number(e.target.value))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1</span><span>50</span></div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">
              Prix/véhicule/jour : <span className="text-primary font-bold">{prixJour} €</span>
              <span className="text-xs text-muted-foreground ml-2">(fourchette {typeVehicle.prixMin}–{typeVehicle.prixMax} €)</span>
            </label>
            <input type="range" min={typeVehicle.prixMin} max={typeVehicle.prixMax} value={prixJour} onChange={(e) => setPrixJour(Number(e.target.value))}
              className="w-full accent-primary" />
          </div>
        </div>

        <div className="flex flex-col justify-center gap-4">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 text-center">
            <div className="text-4xl font-display font-bold text-primary mb-1">{budget.toLocaleString("fr-FR")} €</div>
            <div className="text-sm text-muted-foreground">Budget total de campagne</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-xl font-bold">{impressions.toLocaleString("fr-FR")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Impressions estimées</div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-xl font-bold font-mono">{cpm} €</div>
              <div className="text-xs text-muted-foreground mt-0.5">CPM</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3">
            <strong>{typeVehicle.emoji} {typeVehicle.label}</strong> — {typeVehicle.atout}
          </div>
          <Link
            to="/annonceur/briefs/nouveau"
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition text-center"
          >
            Créer ce brief →
          </Link>
        </div>
      </div>
    </div>
  );
}
