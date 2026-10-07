import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { LogoLink } from "@/components/app/LogoLink";
import { cn } from "@/lib/utils";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/annonceur/etude-marche")({
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
  { key: "camion_led", emoji: "📺", label: "Camion LED (BoxLED)", formats: ["Vidéo MP4 plein écran", "Image JPEG/PNG dynamique", "Flux HTML5 temps réel"], prixMin: 150, prixMax: 800, impressionsMin: 5000, impressionsMax: 20000, demandePct: 25, zones: ["Centre-ville", "Événementiel", "Grands axes", "Zones à fort trafic"], atout: "3 faces écran LED IP67 haute luminosité (3200×1920 px) — visibilité maximale jour et nuit" },
  { key: "taxi", emoji: "🚕", label: "Taxi / VTC", formats: ["Covering total", "Totem toit", "Stickers latéraux"], prixMin: 15, prixMax: 35, impressionsMin: 800, impressionsMax: 2000, demandePct: 28, zones: ["Centre-ville", "Aéroports", "Gares"], atout: "Haute mobilité, présence 24h/24" },
  { key: "van", emoji: "🚐", label: "Van utilitaire", formats: ["Covering flancs", "Covering arrière", "Bâche intégrale"], prixMin: 20, prixMax: 45, impressionsMin: 1200, impressionsMax: 3000, demandePct: 22, zones: ["Artères urbaines", "Zones commerciales", "Périphérie"], atout: "Grande surface d'affichage (4–6 m²)" },
  { key: "food_truck", emoji: "🚚", label: "Food truck", formats: ["Covering carrosserie", "Enseigne lumineuse", "Vitrage"], prixMin: 12, prixMax: 28, impressionsMin: 600, impressionsMax: 1800, demandePct: 10, zones: ["Événementiel", "Marchés", "Quartiers d'affaires"], atout: "Audience captive + temps de contact élevé" },
  { key: "tutuk", emoji: "🛺", label: "Tutuk", formats: ["Covering complet", "Toile tendue", "LED extérieur"], prixMin: 10, prixMax: 25, impressionsMin: 600, impressionsMax: 1400, demandePct: 8, zones: ["Touristique", "Centre historique", "Zones festives"], atout: "Originalité et mémorisation forte, format unique" },
  { key: "scooter", emoji: "🛵", label: "Scooter livraison", formats: ["Top box grand format", "Stickers flancs", "Tablier avant"], prixMin: 5, prixMax: 14, impressionsMin: 400, impressionsMax: 1000, demandePct: 5, zones: ["Centre-ville", "Quartiers denses", "Livraison last mile"], atout: "Accès zones piétonnes, flotte dense" },
  { key: "velo_cargo", emoji: "🚲", label: "Vélo cargo", formats: ["Caisse latérale", "Bâche cargo", "Écran embarqué"], prixMin: 6, prixMax: 16, impressionsMin: 300, impressionsMax: 800, demandePct: 4, zones: ["Zones piétonnes", "Pistes cyclables", "Marchés"], atout: "Image éco-responsable, zones sans voiture" },
  { key: "triporteur", emoji: "🛺", label: "Triporteur", formats: ["Caisse cargo", "Toile tendue", "Panneau arrière"], prixMin: 7, prixMax: 18, impressionsMin: 350, impressionsMax: 900, demandePct: 3, zones: ["Centres commerciaux", "Rues commerçantes", "Marchés"], atout: "Manœuvrabilité en zone dense" },
  { key: "velo_remorque", emoji: "🚲", label: "Vélo remorque", formats: ["Remorque panoramique", "Bâche grande surface"], prixMin: 8, prixMax: 20, impressionsMin: 400, impressionsMax: 1000, demandePct: 0, zones: ["Événementiel", "Marchés", "Parcs"], atout: "Grande surface d'affichage à vélo" },
  { key: "voiture", emoji: "🚗", label: "Voiture", formats: ["Covering partiel", "Pastilles magnétiques", "Arrière vitré"], prixMin: 8, prixMax: 22, impressionsMin: 500, impressionsMax: 1400, demandePct: 0, zones: ["Résidentiel", "Banlieue", "Axes périurbains"], atout: "Flotte disponible en grande quantité" },
  { key: "autre", emoji: "🚌", label: "Autre véhicule", formats: ["Sur mesure"], prixMin: 5, prixMax: 50, impressionsMin: 200, impressionsMax: 3000, demandePct: 0, zones: ["Variable"], atout: "Flexibilité maximale" },
];

// ─── Données prévisionnel (réelles — issues du prévisionnel MoveSpot) ─────────

const YEARS = ["An 1", "An 2", "An 3", "An 4", "An 5"];
const GMV      = [37620,   191880,  668736,  1600560, 3006120];
const COMM     = [11286,   57564,   200621,  480168,  901836];
const REVERS   = [26334,   134316,  468115,  1120392, 2104284];
const CHARGES  = [6137,    16054,   75637,   167610,  298510];
const NET      = [2564,    28327,   93738,   234419,  452495];
const TRESO    = [2564,    30891,   124629,  359048,  811543];
const VEHICULES = [15,     60,      180,     380,     650];
const MARGE    = [22.7,   49.2,    46.7,    48.8,    50.2];
const STRUCTURE = ["Micro-BIC", "Micro-BIC", "SASU (IS)", "SASU (IS)", "SASU (IS)"];

const fmt = (n: number | string) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Number(n)) + " €";

// ─── Composant principal ───────────────────────────────────────────────────────

type Tab = "marche" | "catalogue" | "previsionnel";

function EtudeMarche() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("marche");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleEntry | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <LogoLink />
          <nav className="flex items-center gap-2">
            <Link to="/annonceur/" className="text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full hover:bg-secondary">
              {t("annonceur.etude_marche.back")}
            </Link>
            <Link to="/annonceur/briefs/nouveau" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition">
              {t("annonceur.etude_marche.new_brief_btn")}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="max-w-6xl mx-auto px-6 py-10">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold mb-2">{t("annonceur.etude_marche.title")}</h1>
          <p className="text-muted-foreground text-lg max-w-2xl">
            {t("annonceur.etude_marche.subtitle")}
          </p>
        </div>

        {/* KPI top */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { v: "7 Mds €",      l: t("annonceur.etude_marche.kpi_market"),      s: "+6 %/an" },
            { v: "+18 %",        l: t("annonceur.etude_marche.kpi_growth"),       s: "Segment le plus rapide" },
            { v: "30 %",         l: t("annonceur.etude_marche.kpi_commission"),   s: "Sur GMV annonceurs" },
            { v: "901 836 €",    l: t("annonceur.etude_marche.kpi_ca"),           s: "Marge nette 50 %" },
            { v: "650",          l: t("annonceur.etude_marche.kpi_vehicles"),     s: "Démarrage : 15" },
            { v: "3 006 120 €",  l: t("annonceur.etude_marche.kpi_gmv"),          s: "70 % reversé propriétaires" },
          ].map((k) => (
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
                tab === tabKey ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tabKey === "marche" ? t("annonceur.etude_marche.tab_marche") : tabKey === "catalogue" ? t("annonceur.etude_marche.tab_catalogue") : t("annonceur.etude_marche.tab_previsionnel")}
            </button>
          ))}
        </div>

        {/* ══ ONGLET 1 — MARCHÉ & STRATÉGIE ════════════════════════════════════ */}
        {tab === "marche" && (
          <div className="space-y-6">

            {/* Contexte marché */}
            <div className="grid md:grid-cols-2 gap-5">
              <Card title="Le marché Out-of-Home">
                <p className="text-sm text-muted-foreground">
                  La publicité extérieure représente <strong className="text-foreground">7 milliards €</strong> en France (+6 %/an).
                  Le Digital OOH constitue 35 % du marché et croît de +22 %/an. Le segment <strong className="text-foreground">publicité mobile sur véhicules</strong> est estimé à 1,2 Md € avec +18 %/an — le rythme le plus rapide du secteur.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  MoveSpot adresse ce segment avec une proposition unique : <strong className="text-foreground">ciblage géographique précis par zone polygone</strong>, mesure GPS temps réel et activation sous 7 jours — avantages qu'aucun affichage statique ne peut offrir.
                </p>
              </Card>
              <Card title="Segments annonceurs">
                <div className="space-y-1.5">
                  {[
                    { s: "Commerce local / restauration", f: "Taxi, van", b: "200–800 €/mois", p: 30 },
                    { s: "Retail & franchise", f: "Van, food truck", b: "1 000–5 000 €/mois", p: 25 },
                    { s: "Événement & festival", f: "Tutuk, vélo cargo", b: "500–3 000 €/événement", p: 20 },
                    { s: "Startup / app mobile", f: "Scooter, taxi", b: "1 500–8 000 €/mois", p: 15 },
                    { s: "Grande marque", f: "Flotte multi-formats", b: "10 000 €+/mois", p: 10 },
                  ].map((seg) => (
                    <div key={seg.s} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{seg.s}</div>
                        <div className="text-xs text-muted-foreground">{seg.f}</div>
                      </div>
                      <div className="text-xs font-semibold text-primary whitespace-nowrap">{seg.b}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Benchmark CPM */}
            <Card title="Benchmark CPM — MoveSpot vs autres médias (€ / 1 000 impressions)">
              <p className="text-xs text-muted-foreground mb-4">MoveSpot positionne un CPM mesurable et ciblé, compétitif face aux canaux classiques.</p>
              <div className="space-y-2.5">
                {[
                  { label: "Affichage statique 4×3", cpm: 2.5, highlight: false },
                  { label: "Google Display",          cpm: 3.5, highlight: false },
                  { label: "Radio locale",            cpm: 5,   highlight: false },
                  { label: "Meta Ads",                cpm: 8,   highlight: false },
                  { label: "MoveSpot — Van / Taxi",   cpm: 12,  highlight: true  },
                  { label: "MoveSpot — Tutuk",        cpm: 14,  highlight: true  },
                  { label: "DOOH fixe (partagé)",     cpm: 22,  highlight: false },
                ].map((b) => (
                  <div key={b.label} className="flex items-center gap-3">
                    <div className={cn("text-xs w-44 shrink-0", b.highlight ? "font-semibold text-foreground" : "text-muted-foreground")}>{b.label}</div>
                    <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full flex items-center justify-end pr-2 transition-all", b.highlight ? "bg-primary" : "bg-border")}
                        style={{ width: `${Math.min((b.cpm / 24) * 100, 100)}%` }}
                      >
                        {b.cpm >= 8 && <span className={cn("text-xs font-semibold", b.highlight ? "text-primary-foreground" : "text-muted-foreground")}>{b.cpm} €</span>}
                      </div>
                    </div>
                    {b.cpm < 8 && <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">{b.cpm} €</span>}
                  </div>
                ))}
              </div>
            </Card>

            {/* 5 rôles utilisateurs */}
            <Card title="Les 5 profils utilisateurs MoveSpot">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                  { icon: "🎯", role: "Annonceur", desc: "PME, retail, startups. Crée des briefs, choisit les véhicules, paie via portefeuille Stripe. Suit sa campagne en direct.", tag: "Budget 200–10 000 €/mois", tagCls: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
                  { icon: "🚐", role: "Propriétaire", desc: "Gérant de taxis, vans, food trucks. Inscrit ses véhicules, répond aux briefs, encaisse via Stripe Connect.", tag: "Revenus passifs/véhicule", tagCls: "bg-primary/10 text-primary" },
                  { icon: "🗺️", role: "Chauffeur", desc: "Conduit le véhicule équipé. Valide l'installation avec photos + GPS depuis son espace.", tag: "Suivi photos + GPS", tagCls: "bg-green-500/10 text-green-600 dark:text-green-400" },
                  { icon: "🎨", role: "Prestataire", desc: "Artisan du covering et de l'habillage véhicule. Gère son portfolio et ses abonnements sur MoveSpot.", tag: "Abonnement mensuel", tagCls: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
                  { icon: "🤝", role: "Partenaire", desc: "Apporteur d'affaires, partenaire territorial. Tableau de bord réseau et suivi des commissions.", tag: "Commission réseau", tagCls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
                ].map((p) => (
                  <div key={p.role} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="text-2xl mb-2">{p.icon}</div>
                    <div className="font-semibold text-sm mb-1">{p.role}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{p.desc}</p>
                    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", p.tagCls)}>{p.tag}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Modèle économique */}
            <Card title="Modèle économique — Flux Stripe Connect">
              <p className="text-sm text-muted-foreground mb-4">Mandat d'encaissement : MoveSpot encaisse le GMV et reverse automatiquement 70 % aux propriétaires. Seule la commission de 30 % constitue le CA de MoveSpot.</p>
              <div className="flex flex-col sm:flex-row items-stretch gap-0 mb-4">
                {[
                  { label: "Annonceur paie", value: "100 %", sub: "GMV · via Stripe", color: "bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400" },
                  { label: "MoveSpot retient", value: "30 %", sub: "Commission = CA réel", color: "bg-primary/10 border-primary/30 text-primary" },
                  { label: "Propriétaire reçoit", value: "70 %", sub: "Reversement auto.", color: "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400" },
                ].map((f, i) => (
                  <div key={f.label} className="flex items-center">
                    <div className={cn("flex-1 border rounded-xl p-4 text-center", f.color)}>
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 opacity-70">{f.label}</div>
                      <div className="font-display text-2xl font-bold">{f.value}</div>
                      <div className="text-xs mt-1 opacity-70">{f.sub}</div>
                    </div>
                    {i < 2 && <div className="text-muted-foreground px-3 text-lg shrink-0 hidden sm:block">→</div>}
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
                      <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Critère</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Affichage statique</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">DOOH fixe</th>
                      <th className="py-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">Régie mobile trad.</th>
                      <th className="py-2 px-3 text-xs font-semibold text-primary text-center">MoveSpot</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { c: "Ciblage géographique", a: "❌ Emplacement fixe", b: "⚠️ Zone large", d: "⚠️ Approximatif", e: "✅ Polygone précis" },
                      { c: "Mesure d'impressions", a: "❌ Estimation panel", b: "⚠️ Capteurs ponctuels", d: "❌ Non", e: "✅ GPS temps réel" },
                      { c: "Activation rapide", a: "❌ 4–8 semaines", b: "❌ 4–6 semaines", d: "⚠️ 2–3 semaines", e: "✅ < 7 jours" },
                      { c: "Preuve de diffusion", a: "❌ Non", b: "⚠️ Partielle", d: "❌ Non", e: "✅ Photos + tracé GPS" },
                      { c: "Self-service brief", a: "❌ Non", b: "❌ Non", d: "❌ Non", e: "✅ En ligne 24h/24" },
                      { c: "Formats éco-responsables", a: "❌ Non", b: "❌ Non", d: "⚠️ Partiel", e: "✅ Vélo, tutuk élec." },
                    ].map((row) => (
                      <tr key={row.c} className="border-b border-border/50 hover:bg-secondary/20 transition">
                        <td className="py-2.5 px-3 font-medium text-sm">{row.c}</td>
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">{row.a}</td>
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">{row.b}</td>
                        <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">{row.d}</td>
                        <td className="py-2.5 px-3 text-center text-xs font-semibold text-primary">{row.e}</td>
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
                  { icon: "📍", t: "Ciblage géo précis", d: "Zone de diffusion personnalisée par polygone — quartier, arrondissement, rayon autour d'un point." },
                  { icon: "📊", t: "Mesure en temps réel", d: "Comptage d'impressions GPS, photos d'installation, tableau de bord de suivi en direct." },
                  { icon: "⚡", t: "Activation rapide", d: "Brief validé en 24–72 h. Campagne en ligne sous 7 jours. Pas de délai de production panneaux." },
                  { icon: "🎯", t: "Audience qualifiée", d: "Touche les passants et riverains dans la zone de chalandise exacte de l'annonceur." },
                  { icon: "🔁", t: "Contenu flexible", d: "Changement de créatif entre campagnes. Adaptation rapide du message selon l'actualité." },
                  { icon: "🌱", t: "Image éco-responsable", d: "Vélo cargo, triporteur, tutuk électrique — formats zéro émission pour marques RSE." },
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
              <strong>10 formats de supports disponibles</strong> — du taxi au tutuk en passant par les vélos cargo. Cliquez sur un format pour voir le détail et créer un brief.
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
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-3xl">{v.emoji}</span>
                    {v.demandePct > 0 && (
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", v.demandePct >= 20 ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground")}>
                        {v.demandePct >= 20 ? "⭐ Top" : `${v.demandePct} %`}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{v.label}</h3>
                  <div className="text-xs text-muted-foreground mb-3">{v.formats.slice(0, 2).join(" · ")}</div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">{v.prixMin}–{v.prixMax} €/j</span>
                    <span className="text-xs text-muted-foreground">{(v.impressionsMax / 1000).toFixed(1)}k imp./j</span>
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
                    { l: t("annonceur.etude_marche.detail_prix_jour"), v: `${selectedVehicle.prixMin}–${selectedVehicle.prixMax} €` },
                    { l: t("annonceur.etude_marche.detail_impressions_jour"), v: `${selectedVehicle.impressionsMin.toLocaleString("fr-FR")}–${selectedVehicle.impressionsMax.toLocaleString("fr-FR")}` },
                    { l: t("annonceur.etude_marche.detail_demande"), v: selectedVehicle.demandePct > 0 ? `${selectedVehicle.demandePct} %` : t("annonceur.etude_marche.detail_demande_available") },
                    { l: t("annonceur.etude_marche.detail_zones"), v: selectedVehicle.zones.slice(0, 2).join(", ") },
                  ].map((s) => (
                    <div key={s.l} className="bg-secondary/40 rounded-xl p-3">
                      <div className="text-xs text-muted-foreground mb-1">{s.l}</div>
                      <div className="font-semibold text-sm">{s.v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t("annonceur.etude_marche.detail_formats_title")}</h4>
                    <ul className="space-y-1">
                      {selectedVehicle.formats.map((f) => (
                        <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">{t("annonceur.etude_marche.detail_zones_title")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedVehicle.zones.map((z) => (
                        <span key={z} className="text-xs bg-secondary px-2.5 py-1 rounded-full">{z}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Link to="/annonceur/briefs/nouveau" className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition">
                    {t("annonceur.etude_marche.detail_create_brief", { label: selectedVehicle.label })}
                  </Link>
                  <button onClick={() => setSelectedVehicle(null)} className="rounded-full border border-border px-5 py-2.5 text-sm hover:bg-secondary transition">
                    {t("annonceur.etude_marche.detail_close")}
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
                      {[t("annonceur.etude_marche.col_support"), t("annonceur.etude_marche.col_formats"), t("annonceur.etude_marche.col_prix_j"), t("annonceur.etude_marche.col_impressions_j"), t("annonceur.etude_marche.col_cpm_est"), t("annonceur.etude_marche.col_zones")].map((h) => (
                        <th key={h} className="text-left py-2.5 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap first:pl-4">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CATALOGUE.map((v, i) => {
                      const prixMid = (v.prixMin + v.prixMax) / 2;
                      const impMid = (v.impressionsMin + v.impressionsMax) / 2;
                      const cpm = ((prixMid / impMid) * 1000).toFixed(1);
                      return (
                        <tr key={v.key} className={cn("border-b border-border/50 hover:bg-secondary/20 transition", i % 2 === 1 && "bg-secondary/10")}>
                          <td className="py-2.5 pl-4 pr-3 font-medium">{v.emoji} {v.label}{v.demandePct >= 20 && <span className="ml-1.5 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">⭐</span>}</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{v.formats[0]}</td>
                          <td className="py-2.5 px-3 text-primary font-semibold tabular-nums whitespace-nowrap">{v.prixMin}–{v.prixMax} €</td>
                          <td className="py-2.5 px-3 text-muted-foreground text-xs tabular-nums whitespace-nowrap">{v.impressionsMin.toLocaleString("fr-FR")}–{v.impressionsMax.toLocaleString("fr-FR")}</td>
                          <td className="py-2.5 px-3 font-mono text-xs tabular-nums">{cpm} €</td>
                          <td className="py-2.5 px-3 text-xs text-muted-foreground">{v.zones[0]}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">CPM = Coût Pour Mille impressions. Calculé sur les valeurs moyennes. Indicatif.</p>
            </Card>

            {/* Demande par type */}
            <Card title="Demande annonceurs par type de support">
              <div className="space-y-2.5">
                {CATALOGUE.filter((v) => v.demandePct > 0).sort((a, b) => b.demandePct - a.demandePct).map((v) => (
                  <div key={v.key} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 w-36 shrink-0 text-sm">
                      <span>{v.emoji}</span>
                      <span className="text-xs text-muted-foreground truncate">{v.label}</span>
                    </div>
                    <div className="flex-1 h-5 bg-secondary/50 rounded-full overflow-hidden relative">
                      <div className="absolute inset-y-0 left-0 bg-primary/80 rounded-full flex items-center justify-end pr-2" style={{ width: `${v.demandePct}%` }}>
                        {v.demandePct >= 10 && <span className="text-xs font-bold text-primary-foreground">{v.demandePct} %</span>}
                      </div>
                      {v.demandePct < 10 && <span className="absolute right-2 inset-y-0 flex items-center text-xs text-muted-foreground">{v.demandePct} %</span>}
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
              <p className="text-xs text-muted-foreground mb-4">Commission MoveSpot (30 %, en bleu) + reversement propriétaires (70 %, en gris) = GMV total facturé aux annonceurs.</p>
              <div className="space-y-3">
                {YEARS.map((y, i) => (
                  <div key={y} className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-muted-foreground w-8 shrink-0">{y}</div>
                    <div className="flex-1 h-7 bg-secondary/40 rounded-lg overflow-hidden flex">
                      <div className="h-full bg-primary rounded-l-lg" style={{ width: `${(COMM[i] / GMV[4]) * 100}%` }} />
                      <div className="h-full bg-border" style={{ width: `${(REVERS[i] / GMV[4]) * 100}%`, marginLeft: 2 }} />
                    </div>
                    <div className="text-xs tabular-nums font-semibold text-foreground w-24 text-right shrink-0">{fmt(GMV[i])}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-primary shrink-0" />{t("annonceur.etude_marche.previsionnel_gmv_legend_commission")}</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-border shrink-0" />{t("annonceur.etude_marche.previsionnel_gmv_legend_revers")}</span>
              </div>
            </Card>

            {/* Chart résultat net */}
            <Card title="Résultat net annuel (€ après charges et impôts)">
              <div className="space-y-3">
                {YEARS.map((y, i) => (
                  <div key={y} className="flex items-center gap-3">
                    <div className="text-xs font-semibold text-muted-foreground w-8 shrink-0">{y}</div>
                    <div className="flex-1 h-6 bg-secondary/40 rounded-lg overflow-hidden">
                      <div className="h-full bg-green-500 rounded-lg flex items-center justify-end pr-2" style={{ width: `${(NET[i] / NET[4]) * 100}%` }}>
                        {NET[i] > 50000 && <span className="text-xs font-semibold text-white tabular-nums">{fmt(NET[i])}</span>}
                      </div>
                    </div>
                    {NET[i] <= 50000 && <div className="text-xs tabular-nums font-semibold text-green-600 dark:text-green-400 w-24 text-right shrink-0">{fmt(NET[i])}</div>}
                    {NET[i] > 50000 && <div className="w-24 shrink-0" />}
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
                      {YEARS.map((y) => <th key={y} className="text-right py-2.5 px-3 text-xs font-semibold tabular-nums whitespace-nowrap">{y}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <SectionRow label="Structure & volume" />
                    <DataRow label="Régime juridique" values={STRUCTURE} format={(v) => String(v)} />
                    <DataRow label="Véhicules partenaires" values={VEHICULES} format={(v) => String(v)} />
                    <SectionRow label="Flux financiers" />
                    <DataRow label="GMV — facturé aux annonceurs" values={GMV} format={fmt} />
                    <DataRow label="Reversé propriétaires (70 %)" values={REVERS} format={fmt} />
                    <DataRow label="Commission MoveSpot = CA (30 %)" values={COMM} format={fmt} bold />
                    <SectionRow label="Charges & fiscalité" />
                    <DataRow label="Charges d'exploitation" values={CHARGES} format={fmt} />
                    <DataRow label="URSSAF micro (21,2 % — An 1-2)" values={[2393, 12204, 0, 0, 0]} format={(v) => v === 0 ? "—" : fmt(v)} />
                    <DataRow label="Versement libératoire IR (1,7 %)" values={[192, 979, 0, 0, 0]} format={(v) => v === 0 ? "—" : fmt(v)} />
                    <DataRow label="Impôt sur les sociétés (25 % — An 3-5)" values={[0, 0, 31246, 78140, 150832]} format={(v) => v === 0 ? "—" : fmt(v)} />
                    <tr className="border-t-2 border-border bg-secondary/30">
                      <td className="py-2.5 px-3 font-bold text-foreground">Résultat net (cash après impôts)</td>
                      {NET.map((v, i) => <td key={i} className="py-2.5 px-3 text-right font-bold tabular-nums text-green-600 dark:text-green-400 whitespace-nowrap">{fmt(v)}</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2.5 px-3 font-semibold text-foreground">Marge nette / CA</td>
                      {MARGE.map((v, i) => <td key={i} className="py-2.5 px-3 text-right font-semibold tabular-nums text-foreground">{v} %</td>)}
                    </tr>
                    <tr className="border-b border-border/50">
                      <td className="py-2.5 px-3 font-semibold text-foreground">Trésorerie cumulée fin de période</td>
                      {TRESO.map((v, i) => <td key={i} className="py-2.5 px-3 text-right font-semibold tabular-nums text-foreground whitespace-nowrap">{fmt(v)}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <strong>Hypothèses :</strong> commission stable à 30 % du GMV. Moyenne 2 100 €/véhicule/mois facturé. Passage SASU à partir de l'An 3 (seuil micro-BIC dépassé). Apport initial nul.
              </p>
            </Card>

            {/* Simulateur ROI */}
            <SimulateurROI />

            {/* Feuille de route */}
            <Card title="Feuille de route — 4 phases">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { year: "An 1", phase: "Lancement MVP", gmv: "37 620 €", items: ["Île-de-France prioritaire", "15 véhicules partenaires", "10 annonceurs pilotes", "Stripe Connect + GPS live", "Prestataires couvrant Paris"] },
                  { year: "An 2", phase: "Expansion régionale", gmv: "191 880 €", items: ["Lyon, Marseille, Bordeaux", "60 véhicules partenaires", "Tutuk & vélo cargo actifs", "Brief en ligne v2", "Partenaires réseau apporteurs"] },
                  { year: "An 3", phase: "Croissance nationale", gmv: "668 736 €", items: ["10+ villes, 180 véhicules", "Passage SASU (IS)", "Campagnes multi-villes", "API agences médias", "Dashboard analytics annonceurs"] },
                  { year: "An 4–5", phase: "Scale & consolidation", gmv: "3 006 120 €", items: ["30+ villes, 380–650 véhicules", "Offre grands comptes", "Mesure DOOH certifiée", "Intégrations agences", "Potentiel export Europe"] },
                ].map((p) => (
                  <div key={p.year} className="rounded-xl border border-border overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-3 flex items-center gap-2">
                      <span className="text-xs font-bold text-primary-foreground bg-primary px-2.5 py-1 rounded-full shrink-0">{p.year}</span>
                      <span className="text-sm font-semibold">{p.phase}</span>
                    </div>
                    <div className="p-4">
                      <ul className="space-y-1.5">
                        {p.items.map((it) => (
                          <li key={it} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-primary shrink-0">→</span>{it}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="font-display text-lg font-bold text-primary tabular-nums">{p.gmv}</div>
                        <div className="text-xs text-muted-foreground">{t("annonceur.etude_marche.roadmap_gmv_label")}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Appel à l'action */}
            <div className="rounded-2xl bg-primary/10 border border-primary/30 p-8 text-center">
              <h2 className="font-display text-2xl font-bold mb-2">{t("annonceur.etude_marche.cta_title")}</h2>
              <p className="text-muted-foreground mb-6">{t("annonceur.etude_marche.cta_desc")}</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/annonceur/briefs/nouveau" className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition">
                  {t("annonceur.etude_marche.cta_create")}
                </Link>
                <Link to="/" hash="spots" className="rounded-full border border-primary/40 text-primary px-8 py-3 font-semibold hover:bg-primary/10 transition">
                  {t("annonceur.etude_marche.cta_browse")}
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
      <td colSpan={6} className="py-2 px-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</td>
    </tr>
  );
}

function DataRow({ label, values, format, bold }: { label: string; values: (number | string)[]; format: (v: number | string) => string; bold?: boolean }) {
  return (
    <tr className="border-b border-border/50 hover:bg-secondary/10 transition">
      <td className={cn("py-2 px-3 text-sm", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</td>
      {values.map((v, i) => (
        <td key={i} className={cn("py-2 px-3 text-right text-sm tabular-nums whitespace-nowrap", bold ? "font-semibold text-foreground" : "text-muted-foreground")}>
          {format(v)}
        </td>
      ))}
    </tr>
  );
}

// ─── Simulateur ROI ────────────────────────────────────────────────────────────

function SimulateurROI() {
  const { t } = useTranslation();
  const [jours, setJours] = useState(30);
  const [vehicules, setVehicules] = useState(5);
  const [prixJour, setPrixJour] = useState(30);
  const [typeV, setTypeV] = useState<VehicleEntry>(CATALOGUE[0]);

  const budget = jours * vehicules * prixJour;
  const impMid = (typeV.impressionsMin + typeV.impressionsMax) / 2;
  const impressions = Math.round(jours * vehicules * impMid);
  const cpm = budget > 0 && impressions > 0 ? ((budget / impressions) * 1000).toFixed(2) : "—";

  return (
    <Card title={t("annonceur.etude_marche.sim_title")}>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div>
            <label htmlFor="sim-vehicle-type" className="text-sm font-medium block mb-2">{t("annonceur.etude_marche.sim_vehicle_label")}</label>
            <select
              id="sim-vehicle-type"
              value={typeV.key}
              onChange={(e) => { const v = CATALOGUE.find((c) => c.key === e.target.value); if (v) { setTypeV(v); setPrixJour(Math.round((v.prixMin + v.prixMax) / 2)); } }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATALOGUE.map((v) => <option key={v.key} value={v.key}>{v.emoji} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sim-jours" className="text-sm font-medium block mb-2">{t("annonceur.etude_marche.sim_jours_label", { n: jours })}</label>
            <input id="sim-jours" type="range" min={1} max={180} value={jours} aria-valuetext={`${jours} jours`} onChange={(e) => setJours(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 j</span><span>180 j</span></div>
          </div>
          <div>
            <label htmlFor="sim-vehicules" className="text-sm font-medium block mb-2">{t("annonceur.etude_marche.sim_vehicules_label")} : <span className="text-primary font-bold">{vehicules}</span></label>
            <input id="sim-vehicules" type="range" min={1} max={50} value={vehicules} aria-valuetext={`${vehicules} véhicule${vehicules > 1 ? "s" : ""}`} onChange={(e) => setVehicules(Number(e.target.value))} className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1</span><span>50</span></div>
          </div>
          <div>
            <label htmlFor="sim-prix" className="text-sm font-medium block mb-2">
              {t("annonceur.etude_marche.sim_prix_label")} : <span className="text-primary font-bold">{prixJour} €</span>
              <span className="text-xs text-muted-foreground ml-2">({typeV.prixMin}–{typeV.prixMax} €)</span>
            </label>
            <input id="sim-prix" type="range" min={typeV.prixMin} max={typeV.prixMax} value={prixJour} aria-valuetext={`${prixJour} € par jour`} onChange={(e) => setPrixJour(Number(e.target.value))} className="w-full accent-primary" />
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-5 text-center">
            <div className="font-display text-4xl font-bold text-primary mb-1 tabular-nums">{budget.toLocaleString("fr-FR")} €</div>
            <div className="text-sm text-muted-foreground">{t("annonceur.etude_marche.sim_budget_label")}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-xl font-bold tabular-nums">{impressions.toLocaleString("fr-FR")}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("annonceur.etude_marche.sim_impressions_label")}</div>
            </div>
            <div className="rounded-xl bg-secondary/50 p-4 text-center">
              <div className="text-xl font-bold font-mono tabular-nums">{cpm} €</div>
              <div className="text-xs text-muted-foreground mt-0.5">{t("annonceur.etude_marche.sim_cpm_label")}</div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-secondary/30 rounded-xl p-3">
            <strong>{typeV.emoji} {typeV.label}</strong> — {typeV.atout}
          </div>
          <Link to="/annonceur/briefs/nouveau" className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition text-center">
            {t("annonceur.etude_marche.sim_create_brief")}
          </Link>
        </div>
      </div>
    </Card>
  );
}
