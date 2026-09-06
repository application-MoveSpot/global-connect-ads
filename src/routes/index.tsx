import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { lazy, Suspense, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Menu, X, Instagram, Linkedin, Facebook } from "lucide-react";
import { toast } from "sonner";
import { AdSpots, type Spot } from "@/components/shared/AdSpots";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import logo from "@/assets/movespot-logo.svg";

const MobilityMap = lazy(() => import("@/components/shared/MobilityMap").then((m) => ({ default: m.MobilityMap })));
const BookingForm = lazy(() => import("@/components/shared/BookingForm").then((m) => ({ default: m.BookingForm })));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoveSpot — Marketplace de publicité mobile sur véhicules" },
      { name: "description", content: "MoveSpot met en relation annonceurs et propriétaires de véhicules (food trucks, vans, taxis, scooters de livraison) pour louer des espaces publicitaires mobiles à la journée." },
      { name: "keywords", content: "publicité mobile, marketplace publicitaire véhicules, food truck publicité, habillage van, taxi publicité, scooter livraison pub, DOOH mobile" },
      { property: "og:title", content: "MoveSpot — Marketplace de publicité mobile" },
      { property: "og:description", content: "Louez des espaces publicitaires sur food trucks, vans, taxis et scooters de livraison. Réservation à la journée, sans engagement." },
      { property: "og:url", content: "https://move-spot.com/" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://move-spot.com/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:image", content: "https://move-spot.com/og-image.png" },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/" },
      ...hreflangLinks("/"),
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": "https://move-spot.com/#service",
          name: "Marketplace de publicité mobile MoveSpot",
          description:
            "Louez des espaces publicitaires sur food trucks, vans, taxis et scooters de livraison. Réservation à la journée, sans engagement.",
          provider: { "@id": "https://move-spot.com/#organization" },
          areaServed: { "@type": "Country", name: "France" },
          serviceType: "Publicité extérieure mobile",
          category: "DOOH mobile",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: "10",
            highPrice: "2000",
            offerCount: "3",
            offers: [
              {
                "@type": "Offer",
                name: "Campagne à la zone",
                description: "1,80 €/km²/jour — 2,70 € en grande agglomération",
                price: "1.80",
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
              },
              {
                "@type": "Offer",
                name: "Abonnement Starter",
                description: "29 €/mois par véhicule, 14 jours d'essai gratuit",
                price: "29",
                priceCurrency: "EUR",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  billingIncrement: 1,
                  unitCode: "MON",
                },
              },
              {
                "@type": "Offer",
                name: "Abonnement Pro",
                description: "59 €/mois par véhicule",
                price: "59",
                priceCurrency: "EUR",
                priceSpecification: {
                  "@type": "UnitPriceSpecification",
                  billingIncrement: 1,
                  unitCode: "MON",
                },
              },
            ],
          },
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const stats: { k: string; vKey: string }[] = [
    { k: "1,80 €", vKey: "hero.stat0_v" },
    { k: "10 €", vKey: "hero.stat1_v" },
    { k: "70 / 30", vKey: "hero.stat2_v" },
    { k: "14 j", vKey: "hero.stat3_v" },
  ];

  const featureKeys = ["item0", "item1", "item2", "item3"] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="MoveSpot" width={32} height={32} className="h-8 w-8" />
            <span className="font-display font-bold text-lg tracking-tight">MoveSpot</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#map" className="whitespace-nowrap hover:text-foreground transition">{t("nav.realtime")}</a>
            <a href="#spots" className="whitespace-nowrap hover:text-foreground transition">{t("nav.vehicles")}</a>
            <Link to="/campagnes" className="whitespace-nowrap hover:text-foreground transition">Campagnes</Link>
            <Link to="/comment-ca-marche" className="whitespace-nowrap hover:text-foreground transition">{t("nav.how_it_works")}</Link>
            <Link to="/pourquoi-movespot" className="whitespace-nowrap hover:text-foreground transition">Pourquoi MoveSpot</Link>
            <Link to="/devenir-partenaire" className="whitespace-nowrap hover:text-foreground transition">{t("nav.become_partner")}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="hidden md:flex" />
            <Link to="/annonceur" className="hidden sm:inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition">
              {t("nav.advertiser")}
            </Link>
            <Link to="/proprietaire" className="hidden md:inline-block rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition">
              {t("nav.owner")}
            </Link>
            <a href="#spots" className="hidden sm:inline-block rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition">
              {t("nav.book")}
            </a>
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card hover:bg-secondary transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1 text-sm">
              <a href="#map" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">{t("nav.realtime")}</a>
              <a href="#spots" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">{t("nav.vehicles")}</a>
              <Link to="/campagnes" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Campagnes</Link>
              <Link to="/comment-ca-marche" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">{t("nav.how_it_works")}</Link>
              <Link to="/devenir-partenaire" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">{t("nav.become_partner")}</Link>
              <div className="h-px bg-border my-2" />
              <Link to="/annonceur" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">{t("nav.advertiser")}</Link>
              <Link to="/proprietaire" onClick={() => setMobileMenuOpen(false)} className="py-2 font-medium">{t("nav.owner")}</Link>
              <LanguageSwitcher className="py-2" />
              <a href="#spots" onClick={() => setMobileMenuOpen(false)} className="mt-2 rounded-full bg-primary text-primary-foreground px-4 py-2.5 text-center font-semibold">{t("nav.book")}</a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
            </span>
            {t("hero.badge")}
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            {t("hero.h1")}<br />
            <span className="bg-gradient-signal bg-clip-text text-transparent">{t("hero.h1_accent")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            <Trans
              i18nKey="hero.desc"
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#map" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
              {t("hero.cta_primary")}
            </a>
            <a href="/pitch" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
              {t("hero.cta_secondary")}
            </a>
          </div>
          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            {stats.map((s) => (
              <div key={s.k} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-4">
                <dt className="font-display text-2xl font-bold">{s.k}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{t(s.vKey)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pt-4 pb-8">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">{t("features.badge")}</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold">{t("features.h2")}</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureKeys.map((key) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display font-bold">{t(`features.${key}_t`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`features.${key}_d`)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link to="/comment-ca-marche" className="text-sm text-primary hover:underline">{t("features.link")}</Link>
        </div>
      </section>

      {/* Comparatif concurrents */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Positionnement</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">MoveSpot vs la concurrence</h2>
        <p className="text-muted-foreground mb-10 max-w-2xl">Contrairement aux agences traditionnelles ou aux panneaux fixes, MoveSpot vous connecte directement aux propriétaires de véhicules — sans intermédiaire, sans engagement, avec une mesure d'audience en temps réel.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 text-muted-foreground font-medium w-1/3"></th>
                <th className="py-3 px-4 rounded-t-xl bg-primary text-primary-foreground font-bold text-center">MoveSpot</th>
                <th className="py-3 px-4 text-muted-foreground font-medium text-center">Agence traditionnelle</th>
                <th className="py-3 px-4 text-muted-foreground font-medium text-center">Billboard / Abribus</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Délai de lancement", ms: "5 minutes", ag: "3 à 6 semaines", bb: "2 à 4 semaines" },
                { label: "Prix minimum", ms: "10 €/jour", ag: "1 000 € + frais", bb: "500 €/semaine" },
                { label: "Sans engagement", ms: "✓", ag: "✗ (contrat)", bb: "✗ (contrat)" },
                { label: "Mesure d'audience GPS", ms: "✓ Temps réel", ag: "Estimée", bb: "✗" },
                { label: "Ciblage par zone", ms: "✓ Précis au km", ag: "Approximatif", bb: "✗ Zone fixe" },
                { label: "Disponible en France", ms: "✓", ag: "✓", bb: "✓" },
                { label: "Accès PME & particuliers", ms: "✓", ag: "✗ Grands comptes", bb: "✗ Grands comptes" },
              ].map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-card/40" : ""}>
                  <td className="py-3 px-4 font-medium">{row.label}</td>
                  <td className="py-3 px-4 text-center bg-primary/5 font-semibold text-primary">{row.ms}</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">{row.ag}</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">{row.bb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8">
          <Link to="/pourquoi-movespot" className="text-sm text-primary hover:underline">En savoir plus sur nos avantages →</Link>
        </div>
      </section>

      {/* Mesure d'audience */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="rounded-3xl border border-border bg-gradient-card p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary mb-2">Mesure d'audience</div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Des données réelles, pas des estimations</h2>
              <p className="text-muted-foreground mb-6">Chaque véhicule partenaire transmet sa position GPS en temps réel. MoveSpot calcule automatiquement les impressions générées selon les zones traversées, la densité de population et les horaires de circulation.</p>
              <div className="space-y-3">
                {[
                  { icon: "📍", label: "Tracking GPS en temps réel", desc: "Position exacte toutes les 30 secondes" },
                  { icon: "👁️", label: "Impressions calculées automatiquement", desc: "Basées sur km parcourus × densité de zone" },
                  { icon: "📊", label: "Rapport de campagne détaillé", desc: "Zones couvertes, heures, répétitions" },
                  { icon: "🎯", label: "Ciblage par zone géographique", desc: "Polygones personnalisés sur carte interactive" },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <span className="text-xl flex-shrink-0">{item.icon}</span>
                    <div>
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "150 000+", label: "Impressions/véhicule/mois", sub: "en zone urbaine dense" },
                { value: "1,80 €", label: "CPM moyen", sub: "coût pour 1 000 contacts" },
                { value: "< 5 min", label: "Délai de lancement", sub: "brief → véhicule en route" },
                { value: "100 %", label: "Mesure certifiée GPS", sub: "zéro estimation approximative" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-border bg-card p-5 text-center">
                  <div className="font-display text-2xl font-bold text-primary">{kpi.value}</div>
                  <div className="text-xs font-medium mt-1">{kpi.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Particuliers */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 px-8 py-10">
          <div className="text-xs uppercase tracking-widest text-primary mb-2">Particuliers</div>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Pas besoin d'être une entreprise
          </h2>
          <p className="text-muted-foreground max-w-xl mb-8">
            Mariage, inauguration de commerce, festival local, association… Annoncez votre événement dans votre quartier à partir de 49 €, sans abonnement.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: "💍", label: "Mariage & célébration", desc: "Prévenez vos proches et voisins le jour J — 1 semaine · à partir de 79 €" },
              { icon: "🏪", label: "Ouverture de commerce", desc: "Installez votre présence dans le quartier — 2 semaines · à partir de 149 €" },
              { icon: "🎪", label: "Festival & événement", desc: "Visibilité maximale le week-end — 3 jours · à partir de 49 €" },
            ].map((e) => (
              <div key={e.label} className="rounded-2xl border border-border bg-card p-5">
                <div className="text-3xl mb-3">{e.icon}</div>
                <div className="font-semibold text-sm mb-1">{e.label}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{e.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition"
            >
              Créer mon compte particulier →
            </Link>
            <Link
              to="/annonceur/exemples"
              className="rounded-full border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-secondary transition"
            >
              Voir des exemples de campagnes
            </Link>
          </div>
        </div>
      </section>

      {/* Map */}
      <section id="map" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary mb-2">{t("map.badge")}</div>
            <h2 className="font-display text-4xl font-bold">{t("map.h2")}</h2>
            <p className="text-muted-foreground mt-2">{t("map.desc")}</p>
          </div>
        </div>
        <Suspense fallback={<div className="h-96 rounded-2xl bg-secondary/40 animate-pulse" />}>
          <MobilityMap />
        </Suspense>
      </section>

      {/* Ad Spots */}
      <section id="spots" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <AdSpots onSelect={setSelectedSpot} />
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-4 space-y-6">
          {/* Paiement sécurisé — texte HTML brut indexable par les moteurs */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            <span>Paiement sécurisé :</span>
            <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#003189] dark:text-[#6699ff] shadow-sm">CB</span>
            <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#1A1F71] dark:text-[#6699ff] shadow-sm">Visa</span>
            <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#EB001B] shadow-sm">Mastercard</span>
            <span className="inline-flex items-center gap-1 rounded border border-border bg-white dark:bg-white/10 px-2.5 py-1 font-bold text-[#6772E5] shadow-sm">Stripe</span>
            <span>· Transactions 3D Secure</span>
          </div>

          {/* Réseaux sociaux — en préparation */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="text-xs">Suivez-nous :</span>
            {[
              { icon: Instagram, label: "Instagram" },
              { icon: Linkedin, label: "LinkedIn" },
              { icon: Facebook, label: "Facebook" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                title={`${label} — Page en cours de création`}
                aria-label={`${label} (bientôt disponible)`}
                onClick={() => toast.info(`Notre page ${label} est en cours de création. Revenez bientôt !`)}
                className="rounded-full p-1.5 hover:bg-muted transition-colors cursor-pointer"
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="space-y-0.5">
              <div>© {new Date().getFullYear()} MoveSpot — RAKOUN KLUB · SIRET : 804 671 444 00052</div>
              <div>1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, France</div>
              <div>
                <a href="mailto:contact@move-spot.com" className="hover:text-foreground transition">contact@move-spot.com</a>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link to="/cgu" className="hover:text-foreground transition">CGU</Link>
              <Link to="/cgv" className="hover:text-foreground transition">CGV</Link>
              <Link to="/confidentialite" className="hover:text-foreground transition">Confidentialité</Link>
              <Link to="/cookies" className="hover:text-foreground transition">Cookies</Link>
              <Link to="/mentions-legales" className="hover:text-foreground transition">Mentions légales</Link>
              <Link to="/admin" className="opacity-60 hover:opacity-100 transition">Admin</Link>
            </div>
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <BookingForm spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
      </Suspense>
    </div>
  );
}
