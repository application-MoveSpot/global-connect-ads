import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { lazy, Suspense, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { Instagram } from "lucide-react";
import { toast } from "sonner";
import { AdSpots, type Spot } from "@/components/shared/AdSpots";

const MobilityMap = lazy(() => import("@/components/shared/MobilityMap").then((m) => ({ default: m.MobilityMap })));
const BookingForm = lazy(() => import("@/components/shared/BookingForm").then((m) => ({ default: m.BookingForm })));

export const Route = createFileRoute("/_public/")({
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
            lowPrice: "25",
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
  const tx = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

  const stats: { k: string; vKey: string; fallback: string }[] = [
    { k: "1,80 €", vKey: "hero.stat0_v", fallback: "par km² et par jour (2,70 € en grande agglomération)" },
    { k: "25 €", vKey: "hero.stat1_v", fallback: "par véhicule par jour — soit 375 €/mois pour 1 véhicule" },
    { k: "70 / 30", vKey: "hero.stat2_v", fallback: "reversé aux partenaires / commission MoveSpot" },
    { k: "14 j", vKey: "hero.stat3_v", fallback: "d'essai gratuit sur les campagnes par abonnement" },
  ];

  const featureItems = [
    {
      key: "item0",
      title: "Zones dessinées sur carte",
      desc: "Vous tracez votre polygone de diffusion ; la surface et le budget se calculent automatiquement, avec majoration en zone dense.",
    },
    {
      key: "item1",
      title: "Preuve de diffusion",
      desc: "Positions GPS envoyées par lots puis agrégées : kilomètres réels, minutes actives et taux de couverture de votre zone.",
    },
    {
      key: "item2",
      title: "Paiements souples",
      desc: "Carte bancaire, abonnement avec essai de 14 jours, portefeuille prépayé ou virement bancaire pour les budgets B2B.",
    },
    {
      key: "item3",
      title: "Confiance vérifiée",
      desc: "SIRET contrôlé, QR véhicules signés, pose validée sur 4 photos, double authentification et modération humaine.",
    },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
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
            {tx("hero.badge", "Plateforme en ligne · suivi GPS & paiements actifs")}
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
            {tx("hero.h1", "Vos pubs roulent,")}<br />
            <span className="bg-gradient-signal bg-clip-text text-transparent">{tx("hero.h1_accent", "vos ventes décollent.")}</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            <Trans
              i18nKey="hero.desc"
                defaults="MoveSpot est la marketplace qui met en relation <strong>annonceurs</strong> et <strong>propriétaires de véhicules</strong> — food trucks, vans, taxis, VTC, scooters de livraison. Vous dessinez votre zone, le budget se calcule au km², et chaque kilomètre diffusé est prouvé par GPS."
              components={{ strong: <strong className="text-foreground" /> }}
            />
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#map" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
              {tx("hero.cta_primary", "Découvrir l'aperçu")}
            </a>
            <a href="/pitch" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
              {tx("hero.cta_secondary", "Voir le pitch")}
            </a>
          </div>
          <dl className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl">
            {stats.map((s) => (
              <div key={s.k} className="rounded-2xl border border-border bg-card/50 backdrop-blur p-4">
                <dt className="font-display text-2xl font-bold">{s.k}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{tx(s.vKey, s.fallback)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 pt-4 pb-8">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">{tx("features.badge", "● Ce qui est en place")}</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold">{tx("features.h2", "Une plateforme complète, déjà opérationnelle")}</h2>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featureItems.map((item) => (
            <div key={item.key} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display font-bold">{tx(`features.${item.key}_t`, item.title)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{tx(`features.${item.key}_d`, item.desc)}</p>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <Link to="/comment-ca-marche" className="text-sm text-primary hover:underline">{tx("features.link", "Voir le parcours complet →")}</Link>
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
                { label: "Prix minimum", ms: "25 €/jour", ag: "1 000 € + frais", bb: "500 €/semaine" },
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
                { value: "150 000+", label: "Impressions par véhicule", sub: "par mois, zone urbaine dense" },
                { value: "1,80 €", label: "CPM moyen", sub: "coût pour 1 000 contacts" },
                { value: "< 5 min", label: "Délai de lancement", sub: "brief → véhicule en route" },
                { value: "100 %", label: "Mesure GPS certifiée", sub: "zéro estimation approximative" },
              ].map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-border bg-card p-3 text-center">
                  <div className="font-display text-xl font-bold text-primary leading-tight">{kpi.value}</div>
                  <div className="text-xs font-medium mt-1 leading-snug">{kpi.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{kpi.sub}</div>
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
            Association, inauguration de commerce, festival local… Annoncez votre événement dans votre quartier à partir de 49 €, sans abonnement.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: "🤝", label: "Association & événement local", desc: "Club sportif, comité des fêtes, association culturelle… — 1 semaine · à partir de 79 €" },
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
            <div className="text-xs uppercase tracking-widest text-primary mb-2">{tx("map.badge", "● Aperçu")}</div>
            <h2 className="font-display text-4xl font-bold">{tx("map.h2", "Véhicules en circulation")}</h2>
            <p className="text-muted-foreground mt-2">{tx("map.desc", "Aperçu des flux de véhicules. Sur une campagne active, cette carte affiche les positions réelles, les kilomètres parcourus et la part du trajet réalisée dans votre zone.")}</p>
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

          {/* Réseaux sociaux */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="text-xs">Suivez-nous :</span>
            <a
              href="https://www.instagram.com/movespot_pub/"
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              aria-label="Instagram"
              className="rounded-full p-1.5 hover:bg-muted transition-colors"
            >
              <Instagram className="h-5 w-5" />
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="space-y-0.5">
              <div>© {new Date().getFullYear()} MoveSpot — RAKOUN KLUB · SIRET : 804 671 444 00052</div>
              <div>1 Lot, Immeuble Sud Jarry, ZAC de Houelbourg, 97122 Baie-Mahault, France</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link to="/annonceurs-entreprise" className="hover:text-foreground transition">Solution B2B</Link>
              <Link to="/cgu" className="hover:text-foreground transition">CGU</Link>
              <Link to="/cgv" className="hover:text-foreground transition">CGV</Link>
              <Link to="/confidentialite" className="hover:text-foreground transition">Confidentialité</Link>
              <Link to="/cookies" className="hover:text-foreground transition">Cookies</Link>
              <Link to="/mentions-legales" className="hover:text-foreground transition">Mentions légales</Link>
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
