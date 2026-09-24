import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";

export const Route = createFileRoute("/_public/annonceurs-entreprise")({
  head: () => ({
    meta: [
      { title: "Publicité mobile certifiée GPS pour entreprises — MoveSpot" },
      { name: "description", content: "Diffusez vos campagnes sur des véhicules en mouvement dans vos zones cibles. Chaque kilomètre prouvé par GPS, rapport PDF téléchargeable, CPM entre 2 € et 5 €. Solution idéale pour les directions marketing B2B." },
      { property: "og:title", content: "Publicité mobile B2B certifiée GPS — MoveSpot" },
      { property: "og:description", content: "Campagnes prouvées GPS, rapport de diffusion certifié, ciblage géographique précis. Pilote B2B dès 25 €/véhicule/jour." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Service",
          name: "MoveSpot — Publicité mobile B2B certifiée GPS",
          provider: { "@type": "Organization", name: "MoveSpot", url: "https://move-spot.com" },
          description: "Service de publicité mobile sur véhicules avec preuve de diffusion GPS et rapport certifié. Destiné aux annonceurs et directions marketing.",
          areaServed: { "@type": "Country", name: "France" },
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: "25",
              priceCurrency: "EUR",
              unitText: "par véhicule par jour",
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

const PROOF_ITEMS = [
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
];

const CPM_COMPARISON = [
  { media: "Affichage 4×3 (OOH)", cpm: "8 – 15 €", note: "sans preuve de vue" },
  { media: "Display digital", cpm: "2 – 6 €", note: "bloqué par les adblockers" },
  { media: "Radio locale", cpm: "5 – 12 €", note: "audience non géolocalisée" },
  { media: "MoveSpot (GPS)", cpm: "2 – 5 €", note: "preuve de diffusion incluse ✓", highlight: true },
];

const HOW_IT_WORKS = [
  { n: "01", t: "Définissez votre zone sur la carte", d: "Dessinez votre polygon géographique (quartier, ZAC, route, événement). Le budget se calcule automatiquement au km² × jours." },
  { n: "02", t: "Choisissez vos véhicules et votre durée", d: "Taxis, food trucks, vans ou flottes d'entreprise. Campagne ponctuelle, semaine ou mois. Pilote possible dès 1 véhicule." },
  { n: "03", t: "La diffusion commence, vous suivez en live", d: "Dashboard temps réel, positions GPS, taux de couverture. Votre responsable marketing reçoit le rapport chaque jour." },
  { n: "04", t: "Rapport certifié à télécharger", d: "PDF signé avec données GPS, graphe quotidien, attestation de diffusion et récapitulatif financier pour votre comptabilité." },
];

function AnnonceursEntreprise() {
  return (
    <div className="min-h-screen bg-background">


      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
          🏢 Solution B2B — Directions marketing & agences
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight leading-tight">
          Vos campagnes prouvées.<br />
          <span className="bg-gradient-signal bg-clip-text text-transparent">GPS. Certifié.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-3xl mx-auto">
          Diffusez vos publicités sur des véhicules en mouvement dans vos zones cibles.
          Chaque kilomètre est tracé, chaque passage comptabilisé.
          Rapport de diffusion certifié à télécharger pour votre reporting interne.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link
            to="/annonceur/inscription"
            className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
          >
            Démarrer un pilote B2B
          </Link>
          <Link
            to="/comment-ca-marche"
            className="rounded-full border border-border bg-card/50 backdrop-blur px-8 py-3 font-semibold hover:bg-card transition"
          >
            Voir comment ça marche
          </Link>
        </div>

        {/* Key metrics */}
        <div className="grid sm:grid-cols-3 gap-5 mt-14">
          {[
            { k: "25 €", v: "par véhicule / jour (tarif plancher)", note: "Pilote possible dès 1 véhicule" },
            { k: "2 – 5 €", v: "CPM estimé (contacts / 1 000)", note: "Vs 8–15 € pour l'affichage OOH classique" },
            { k: "100 %", v: "des km prouvés par GPS", note: "Rapport certifié téléchargeable en PDF" },
          ].map((s) => (
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
              ● La preuve de diffusion
            </span>
            <h2 className="font-display text-3xl font-bold">Ce que vous obtenez, en plus de la visibilité</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {PROOF_ITEMS.map((item) => (
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
          <h2 className="font-display text-3xl font-bold">Comparaison CPM</h2>
          <p className="text-muted-foreground text-sm mt-2">Coût pour 1 000 contacts estimés (ordre de grandeur France 2024)</p>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Support</th>
                <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">CPM estimé</th>
                <th className="px-5 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CPM_COMPARISON.map((row) => (
                <tr
                  key={row.media}
                  className={row.highlight ? "bg-primary/5 font-semibold" : ""}
                >
                  <td className="px-5 py-3">
                    {row.highlight && <span className="mr-2">⭐</span>}
                    {row.media}
                  </td>
                  <td className={`px-5 py-3 text-right tabular-nums ${row.highlight ? "text-primary" : ""}`}>{row.cpm}</td>
                  <td className={`px-5 py-3 hidden sm:table-cell text-xs ${row.highlight ? "text-primary" : "text-muted-foreground"}`}>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Estimations basées sur des données sectorielles publiques. Le CPM réel dépend de la zone, de la durée et du type de véhicule.
        </p>
      </section>

      {/* How it works */}
      <section className="bg-card/40 border-y border-border py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold">Comment lancer votre pilote</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {HOW_IT_WORKS.map((s) => (
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
                📄 Rapport certifié inclus
              </span>
              <h2 className="font-display text-2xl font-bold mb-4">
                Un document que vos décideurs peuvent valider
              </h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {[
                  "Référence de rapport unique (RPT-ANNÉE-ID)",
                  "Graphe de couverture jour par jour",
                  "Tableau quotidien : km totaux, km en zone, taux de couverture, minutes actives",
                  "Attestation de diffusion GPS certifiée MoveSpot",
                  "Récapitulatif financier (montant HT, statut paiement)",
                  "Contacts estimés × jours de diffusion actifs",
                ].map((item) => (
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
                  <div className="font-bold text-sm text-gray-900 dark:text-white">MoveSpot</div>
                  <div className="text-gray-400 text-[10px]">Publicité mobile sur véhicules</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm text-gray-900 dark:text-white">RAPPORT DE DIFFUSION</div>
                  <div className="text-gray-400 text-[10px]">RPT-2025-A1B2C3D4</div>
                </div>
              </div>
              <div className="w-full h-12 bg-gray-100 dark:bg-gray-800 rounded mb-2 flex items-end gap-0.5 px-1 pb-1">
                {[40, 65, 80, 55, 90, 75, 85, 60, 95, 70, 88, 72, 50, 68].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end gap-px">
                    <div style={{ height: `${h * 0.28}px` }} className="bg-emerald-400 rounded-sm" />
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between"><span className="text-gray-500">Taux de couverture</span><span className="font-bold text-emerald-700">78 %</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Jours actifs</span><span className="font-semibold">14 j</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Distance en zone</span><span className="font-semibold">312 km</span></div>
              </div>
              <div className="mt-2 rounded border-2 border-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-1 flex items-center gap-2">
                <div className="text-[10px] font-bold text-emerald-700 leading-none">GPS<br/>CERT.</div>
                <div className="text-[9px] text-emerald-700">Attestation de diffusion certifiée MoveSpot</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-3">Prêt à lancer votre pilote ?</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Démarrez avec 1 véhicule sur 7 jours pour valider le concept. Pas d'engagement,
          rapport GPS certifié inclus, facturation à la fin de la campagne.
        </p>
        <Link
          to="/annonceur/inscription"
          className="inline-block rounded-full bg-primary text-primary-foreground px-10 py-4 font-semibold text-lg hover:bg-primary/90 transition shadow-glow"
        >
          Créer mon compte annonceur
        </Link>
        <p className="text-xs text-muted-foreground mt-4">
          Vous avez des questions ?{" "}
          <Link to="/contact" className="underline hover:text-foreground">
            Contactez-nous
          </Link>{" "}
          ou consultez{" "}
          <Link to="/comment-ca-marche" className="underline hover:text-foreground">
            comment ça marche
          </Link>
          .
        </p>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MoveSpot —{" "}
          <Link to="/devenir-partenaire" className="hover:text-foreground">
            Propriétaires de véhicules
          </Link>
          {" · "}
          <Link to="/comment-ca-marche" className="hover:text-foreground">
            Comment ça marche
          </Link>
        </div>
      </footer>
    </div>
  );
}
