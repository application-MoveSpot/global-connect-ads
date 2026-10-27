import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/_public/annonceurs-entreprise")({
  head: () => ({
    meta: [
      {
        title:
          "GPS-certified mobile advertising for businesses — MoveSpot | Publicité mobile certifiée GPS pour entreprises",
      },
      {
        name: "description",
        content:
          "Run campaigns on moving vehicles in your target zones. Every kilometre proved by GPS, downloadable PDF report, CPM between €2 and €5. Ideal for B2B marketing teams.",
      },
      { property: "og:title", content: "GPS-certified B2B mobile advertising — MoveSpot" },
      {
        property: "og:description",
        content:
          "GPS-verified campaigns, certified delivery report, precise geographic targeting. B2B pilot from €25/vehicle/day.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "MoveSpot — GPS-certified B2B mobile advertising",
          provider: { "@type": "Organization", name: "MoveSpot", url: "https://move-spot.com" },
          description:
            "Mobile advertising service on vehicles with GPS delivery proof and certified report. For advertisers and marketing teams.",
          areaServed: { "@type": "Country", name: "France" },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "25",
              priceCurrency: "EUR",
              unitText: "per vehicle per day",
            },
          },
        }),
      },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/annonceurs-entreprise" },
      ...hreflangLinks("/annonceurs-entreprise"),
    ],
  }),
  component: AnnonceursEntreprise,
});

const CONTENT = {
  fr: {
    hero_badge: "🏢 Solution B2B — Directions marketing & agences",
    h1_line1: "Vos campagnes prouvées.",
    h1_line2: "GPS. Certifié.",
    hero_desc:
      "Diffusez vos publicités sur des véhicules en mouvement dans vos zones cibles. Chaque kilomètre est tracé, chaque passage comptabilisé. Rapport de diffusion certifié à télécharger pour votre reporting interne.",
    cta_primary: "Démarrer un pilote B2B",
    cta_secondary: "Voir comment ça marche",
    cta_secondary_to: "/comment-ca-marche",
    metrics: [
      {
        k: "25 €",
        v: "par véhicule / jour (tarif plancher)",
        note: "Pilote possible dès 1 véhicule",
      },
      {
        k: "2 – 5 €",
        v: "CPM estimé (contacts / 1 000)",
        note: "Vs 8–15 € pour l'affichage OOH classique",
      },
      { k: "100 %", v: "des km prouvés par GPS", note: "Rapport certifié téléchargeable en PDF" },
    ],
    proof_badge: "● La preuve de diffusion",
    proof_h2: "Ce que vous obtenez, en plus de la visibilité",
    proof_items: [
      {
        icon: "📡",
        title: "Tracking GPS temps réel",
        desc: "Chaque point de géolocalisation est enregistré toutes les 30 secondes. Vous voyez en direct où vos véhicules se trouvent dans votre zone de ciblage.",
      },
      {
        icon: "📊",
        title: "Métriques de couverture vérifiées",
        desc: "Taux de couverture, kilomètres en zone, minutes actives et carte de chaleur — agrégés automatiquement, impossibles à falsifier a posteriori.",
      },
      {
        icon: "📄",
        title: "Rapport PDF certifié",
        desc: "Téléchargez en un clic un rapport signé avec graphe jour/jour, tableau quotidien, récapitulatif financier et attestation de diffusion GPS certifiée.",
      },
      {
        icon: "🛡",
        title: "Conformité RGPD & réglementation",
        desc: "SIRET vérifié, campagnes soumises à modération, conformité Code de l'environnement. Votre direction juridique peut valider en amont.",
      },
    ],
    cpm_h2: "Comparaison CPM",
    cpm_sub: "Coût pour 1 000 contacts estimés (ordre de grandeur France 2024)",
    cpm_col_media: "Support",
    cpm_col_cpm: "CPM estimé",
    cpm_col_note: "Note",
    cpm_rows: [
      { media: "Affichage 4×3 (OOH)", cpm: "8 – 15 €", note: "sans preuve de vue" },
      { media: "Display digital", cpm: "2 – 6 €", note: "bloqué par les adblockers" },
      { media: "Radio locale", cpm: "5 – 12 €", note: "audience non géolocalisée" },
      {
        media: "MoveSpot (GPS)",
        cpm: "2 – 5 €",
        note: "preuve de diffusion incluse ✓",
        highlight: true,
      },
    ],
    cpm_disclaimer:
      "Estimations basées sur des données sectorielles publiques. Le CPM réel dépend de la zone, de la durée et du type de véhicule.",
    how_h2: "Comment lancer votre pilote",
    how_steps: [
      {
        n: "01",
        t: "Définissez votre zone sur la carte",
        d: "Dessinez votre polygon géographique (quartier, ZAC, route, événement). Le budget se calcule automatiquement au km² × jours.",
      },
      {
        n: "02",
        t: "Choisissez vos véhicules et votre durée",
        d: "Taxis, food trucks, vans ou flottes d'entreprise. Campagne ponctuelle, semaine ou mois. Pilote possible dès 1 véhicule.",
      },
      {
        n: "03",
        t: "La diffusion commence, vous suivez en live",
        d: "Dashboard temps réel, positions GPS, taux de couverture. Votre responsable marketing reçoit le rapport chaque jour.",
      },
      {
        n: "04",
        t: "Rapport certifié à télécharger",
        d: "PDF signé avec données GPS, graphe quotidien, attestation de diffusion et récapitulatif financier pour votre comptabilité.",
      },
    ],
    report_badge: "📄 Rapport certifié inclus",
    report_h2: "Un document que vos décideurs peuvent valider",
    report_items: [
      "Référence de rapport unique (RPT-ANNÉE-ID)",
      "Graphe de couverture jour par jour",
      "Tableau quotidien : km totaux, km en zone, taux de couverture, minutes actives",
      "Attestation de diffusion GPS certifiée MoveSpot",
      "Récapitulatif financier (montant HT, statut paiement)",
      "Contacts estimés × jours de diffusion actifs",
    ],
    report_mock_title: "MoveSpot",
    report_mock_subtitle: "Publicité mobile sur véhicules",
    report_mock_label: "RAPPORT DE DIFFUSION",
    report_mock_coverage: "Taux de couverture",
    report_mock_days: "Jours actifs",
    report_mock_distance: "Distance en zone",
    report_mock_cert: "Attestation de diffusion certifiée MoveSpot",
    cta_h2: "Prêt à lancer votre pilote ?",
    cta_desc:
      "Démarrez avec 1 véhicule sur 7 jours pour valider le concept. Pas d'engagement, rapport GPS certifié inclus, facturation à la fin de la campagne.",
    cta_btn: "Créer mon compte advertiser",
    cta_contact: "Vous avez des questions ?",
    cta_contact_link: "Contactez-nous",
    cta_how: "comment ça marche",
    footer_owners: "Propriétaires de véhicules",
    footer_how: "Comment ça marche",
  },
  en: {
    hero_badge: "🏢 B2B solution — Marketing teams & agencies",
    h1_line1: "Your campaigns, proved.",
    h1_line2: "GPS. Certified.",
    hero_desc:
      "Run your ads on moving vehicles in your target zones. Every kilometre tracked, every pass counted. Download a certified delivery report for your internal reporting.",
    cta_primary: "Start a B2B pilot",
    cta_secondary: "See how it works",
    cta_secondary_to: "/comment-ca-marche",
    metrics: [
      { k: "€25", v: "per vehicle / day (floor rate)", note: "Pilot possible from just 1 vehicle" },
      {
        k: "€2 – 5",
        v: "estimated CPM (contacts / 1,000)",
        note: "vs €8–15 for classic OOH billboard",
      },
      { k: "100%", v: "of km proved by GPS", note: "Certified PDF report available to download" },
    ],
    proof_badge: "● Delivery proof",
    proof_h2: "What you get, on top of visibility",
    proof_items: [
      {
        icon: "📡",
        title: "Real-time GPS tracking",
        desc: "Every geolocation point is recorded every 30 seconds. You see live where your vehicles are within your target zone.",
      },
      {
        icon: "📊",
        title: "Verified coverage metrics",
        desc: "Coverage rate, km in zone, active minutes and heat map — aggregated automatically, impossible to falsify after the fact.",
      },
      {
        icon: "📄",
        title: "Certified PDF report",
        desc: "Download in one click a signed report with a day-by-day chart, daily table, financial summary and certified GPS delivery certificate.",
      },
      {
        icon: "🛡",
        title: "GDPR & regulatory compliance",
        desc: "SIRET verified, campaigns subject to moderation, compliant with environmental regulation. Your legal team can validate upfront.",
      },
    ],
    cpm_h2: "CPM comparison",
    cpm_sub: "Cost per 1,000 estimated contacts (France 2024 benchmarks)",
    cpm_col_media: "Channel",
    cpm_col_cpm: "Estimated CPM",
    cpm_col_note: "Note",
    cpm_rows: [
      { media: "Billboard 4×3 (OOH)", cpm: "€8 – 15", note: "no view proof" },
      { media: "Digital display", cpm: "€2 – 6", note: "blocked by ad-blockers" },
      { media: "Local radio", cpm: "€5 – 12", note: "non-geolocated audience" },
      {
        media: "MoveSpot (GPS)",
        cpm: "€2 – 5",
        note: "delivery proof included ✓",
        highlight: true,
      },
    ],
    cpm_disclaimer:
      "Estimates based on public industry data. Actual CPM depends on zone, duration and vehicle type.",
    how_h2: "How to launch your pilot",
    how_steps: [
      {
        n: "01",
        t: "Draw your zone on the map",
        d: "Draw your geographic polygon (neighbourhood, business park, road, event). Budget calculates automatically per km² × days.",
      },
      {
        n: "02",
        t: "Choose your vehicles and duration",
        d: "Taxis, food trucks, vans or company fleets. One-off campaign, a week or a month. Pilot from just 1 vehicle.",
      },
      {
        n: "03",
        t: "Delivery begins, you track it live",
        d: "Real-time dashboard, GPS positions, coverage rate. Your marketing manager receives the report every day.",
      },
      {
        n: "04",
        t: "Certified report to download",
        d: "Signed PDF with GPS data, daily chart, delivery certificate and financial summary for your accounting.",
      },
    ],
    report_badge: "📄 Certified report included",
    report_h2: "A document your decision-makers can validate",
    report_items: [
      "Unique report reference (RPT-YEAR-ID)",
      "Day-by-day coverage chart",
      "Daily table: total km, km in zone, coverage rate, active minutes",
      "MoveSpot certified GPS delivery certificate",
      "Financial summary (net amount, payment status)",
      "Estimated contacts × active delivery days",
    ],
    report_mock_title: "MoveSpot",
    report_mock_subtitle: "Mobile vehicle advertising",
    report_mock_label: "DELIVERY REPORT",
    report_mock_coverage: "Coverage rate",
    report_mock_days: "Active days",
    report_mock_distance: "Distance in zone",
    report_mock_cert: "MoveSpot certified delivery certificate",
    cta_h2: "Ready to launch your pilot?",
    cta_desc:
      "Start with 1 vehicle for 7 days to validate the concept. No commitment, certified GPS report included, billing at the end of the campaign.",
    cta_btn: "Create my advertiser account",
    cta_contact: "Got questions?",
    cta_contact_link: "Contact us",
    cta_how: "how it works",
    footer_owners: "Vehicle owners",
    footer_how: "How it works",
  },
};

function AnnonceursEntreprise() {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? CONTENT.en : CONTENT.fr;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
          {c.hero_badge}
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          {c.h1_line1}
          <br />
          <span className="bg-gradient-signal bg-clip-text text-transparent">{c.h1_line2}</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">{c.hero_desc}</p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            to="/advertiser/inscription"
            className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
          >
            {c.cta_primary}
          </Link>
          <Link
            to="/comment-ca-marche"
            className="rounded-full border border-border bg-card/50 backdrop-blur px-8 py-3 font-semibold hover:bg-card transition"
          >
            {c.cta_secondary}
          </Link>
        </div>

        {/* Key metrics */}
        <div className="grid sm:grid-cols-3 gap-5 mt-14">
          {c.metrics.map((s) => (
            <div key={s.k} className="rounded-2xl border border-border bg-card p-5 text-left">
              <p className="font-display text-3xl font-bold text-primary">{s.k}</p>
              <p className="text-sm font-medium mt-1">{s.v}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof items */}
      <section className="bg-card/40 border-y border-border py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-xs font-medium mb-4">
              {c.proof_badge}
            </span>
            <h2 className="font-display text-3xl font-bold">{c.proof_h2}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {c.proof_items.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-2xl mb-3">{item.icon}</div>
                <h3 className="font-display text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CPM comparison */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold">{c.cpm_h2}</h2>
          <p className="text-muted-foreground text-sm mt-2">{c.cpm_sub}</p>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  {c.cpm_col_media}
                </th>
                <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">
                  {c.cpm_col_cpm}
                </th>
                <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                  {c.cpm_col_note}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {c.cpm_rows.map((row) => (
                <tr key={row.media} className={row.highlight ? "bg-primary/5 font-semibold" : ""}>
                  <td className="px-5 py-3">
                    {row.highlight && <span className="mr-2">⭐</span>}
                    {row.media}
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular-nums ${row.highlight ? "text-primary" : ""}`}
                  >
                    {row.cpm}
                  </td>
                  <td
                    className={`px-5 py-3 hidden sm:table-cell text-xs ${row.highlight ? "text-primary" : "text-muted-foreground"}`}
                  >
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">{c.cpm_disclaimer}</p>
      </section>

      {/* How it works */}
      <section className="bg-card/40 border-y border-border py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold">{c.how_h2}</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {c.how_steps.map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="text-xs font-mono text-primary mb-2">{s.n}</div>
                <h3 className="font-display text-lg font-bold mb-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Report preview section */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl border border-primary/20 bg-card p-8 md:p-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs font-medium mb-4">
                {c.report_badge}
              </span>
              <h2 className="font-display text-2xl font-bold mb-4">{c.report_h2}</h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {c.report_items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white dark:bg-card border border-border p-5 text-xs font-mono text-gray-700 dark:text-gray-300 shadow-sm">
              <div className="flex justify-between mb-3">
                <div>
                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {c.report_mock_title}
                  </div>
                  <div className="text-gray-400 text-[10px]">{c.report_mock_subtitle}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">
                    {c.report_mock_label}
                  </div>
                  <div className="text-gray-400 text-[10px]">RPT-2025-A1B2C3D4</div>
                </div>
              </div>
              <div className="w-full h-12 bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-end gap-0.5 px-1 pb-1">
                {[40, 65, 80, 55, 90, 75, 85, 60, 95, 70, 88, 72, 50, 68].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-px">
                    <div
                      style={{ height: `${h * 0.28}px` }}
                      className="bg-emerald-400 rounded-sm"
                    />
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">{c.report_mock_coverage}</span>
                  <span className="font-bold text-emerald-700">78 %</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{c.report_mock_days}</span>
                  <span className="font-semibold">14 j</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{c.report_mock_distance}</span>
                  <span className="font-semibold">312 km</span>
                </div>
              </div>
              <div className="mt-2 rounded border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 flex items-center gap-2">
                <div className="text-[10px] font-bold text-emerald-700 leading-none">
                  GPS
                  <br />
                  CERT.
                </div>
                <div className="text-[9px] text-emerald-700">{c.report_mock_cert}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-3">{c.cta_h2}</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">{c.cta_desc}</p>
        <Link
          to="/advertiser/inscription"
          className="inline-block rounded-full bg-primary text-primary-foreground px-10 py-4 font-semibold text-lg hover:bg-primary/90 transition shadow-glow"
        >
          {c.cta_btn}
        </Link>
        <p className="text-xs text-muted-foreground mt-4">
          {c.cta_contact}{" "}
          <Link to="/contact" className="underline hover:text-foreground">
            {c.cta_contact_link}
          </Link>{" "}
          {i18n.language === "en" ? "or check" : "ou consultez"}{" "}
          <Link to="/comment-ca-marche" className="underline hover:text-foreground">
            {c.cta_how}
          </Link>
          .
        </p>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MoveSpot —{" "}
          <Link to="/devenir-partenaire" className="hover:text-foreground">
            {c.footer_owners}
          </Link>
          {" · "}
          <Link to="/comment-ca-marche" className="hover:text-foreground">
            {c.footer_how}
          </Link>
        </div>
      </footer>
    </div>
  );
}
