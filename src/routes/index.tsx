import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Menu, X } from "lucide-react";
import { MobilityMap } from "@/components/shared/MobilityMap";
import { AdSpots, type Spot } from "@/components/shared/AdSpots";
import { BookingForm } from "@/components/shared/BookingForm";
import { LanguageSwitcher } from "@/components/app/LanguageSwitcher";
import logo from "@/assets/movespot-logo.svg";

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
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/" },
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
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#map" className="hover:text-foreground transition">{t("nav.realtime")}</a>
            <a href="#spots" className="hover:text-foreground transition">{t("nav.vehicles")}</a>
            <Link to="/comment-ca-marche" className="hover:text-foreground transition">{t("nav.how_it_works")}</Link>
            <Link to="/devenir-partenaire" className="hover:text-foreground transition">{t("nav.become_partner")}</Link>
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

      {/* Map */}
      <section id="map" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary mb-2">{t("map.badge")}</div>
            <h2 className="font-display text-4xl font-bold">{t("map.h2")}</h2>
            <p className="text-muted-foreground mt-2">{t("map.desc")}</p>
          </div>
        </div>
        <MobilityMap />
      </section>

      {/* Ad Spots */}
      <section id="spots" className="max-w-7xl mx-auto px-6 py-20 scroll-mt-20">
        <AdSpots onSelect={setSelectedSpot} />
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} MoveSpot. {t("footer.copyright")}</div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link to="/cgu" className="hover:text-foreground transition">{t("footer.cgu")}</Link>
            <Link to="/cgv" className="hover:text-foreground transition">{t("footer.cgv")}</Link>
            <Link to="/confidentialite" className="hover:text-foreground transition">{t("footer.confidentialite")}</Link>
            <Link to="/cookies" className="hover:text-foreground transition">{t("footer.cookies")}</Link>
            <Link to="/mentions-legales" className="hover:text-foreground transition">{t("footer.mentions")}</Link>
            <Link to="/admin" className="opacity-60 hover:opacity-100 transition">{t("footer.admin")}</Link>
          </div>
        </div>
      </footer>

      <BookingForm spot={selectedSpot} onClose={() => setSelectedSpot(null)} />
    </div>
  );
}
