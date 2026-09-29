import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/pourquoi-movespot")({
  head: () => ({
    meta: [
      { title: "Pourquoi MoveSpot — Publicité mobile sans agence" },
      {
        name: "description",
        content:
          "MoveSpot est le premier marketplace français de publicité mobile sur véhicules. Lancez votre campagne en 5 minutes, suivez vos résultats GPS en temps réel, sans engagement.",
      },
      {
        name: "keywords",
        content:
          "publicité mobile alternative agence, comparatif publicité véhicule, movespot vs agence, DOOH mobile France, publicité sans engagement",
      },
      { property: "og:title", content: "Pourquoi MoveSpot — La pub mobile sans agence" },
      {
        property: "og:description",
        content:
          "Lancez votre campagne en 5 minutes sur les vrais véhicules des propriétaires. Pas d'agence, pas de contrat, mesure GPS incluse.",
      },
    ],
    links: [
      { rel: "canonical", href: "https://move-spot.com/pourquoi-movespot" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap",
      },
    ],
  }),
  component: PourquoiMovespot,
});

const AVANTAGES = [
  {
    icon: "⚡",
    titre: "Lancement en 5 minutes",
    desc: "Créez votre brief, choisissez vos zones et votre budget. Un véhicule partenaire est assigné immédiatement, pas besoin d'attendre un devis ou un responsable commercial.",
    vs: "Les agences traditionnelles demandent 3 à 6 semaines entre la demande et le lancement effectif.",
  },
  {
    icon: "💶",
    titre: "À partir de 25 € par jour",
    desc: "MoveSpot est accessible aux PME, commerçants, associations et particuliers. Pas de frais d'agence cachés, budget maîtrisé dès le premier jour.",
    vs: "Un panneau d'affichage classique coûte en moyenne 500 €/semaine, sans mesure d'audience précise.",
  },
  {
    icon: "🚫",
    titre: "Sans engagement",
    desc: "Réservez pour une journée, une semaine ou un mois. Arrêtez quand vous voulez. Aucun contrat annuel, aucune pénalité.",
    vs: "Les agences et régies imposent des contrats de 3 à 12 mois avec clauses de résiliation.",
  },
  {
    icon: "📍",
    titre: "Mesure GPS certifiée",
    desc: "Chaque véhicule partenaire transmet sa position en temps réel. Vous voyez exactement quelles rues ont été parcourues, à quelle heure, et combien d'impressions ont été générées.",
    vs: "Les billboards et la plupart des agences fournissent des estimations basées sur des études de trafic périmées.",
  },
  {
    icon: "🎯",
    titre: "Ciblage géographique précis",
    desc: "Dessinez directement sur la carte les zones que vous voulez couvrir. Les véhicules partenaires dans ces zones reçoivent votre brief automatiquement.",
    vs: "Wrapify (leader US) n'est pas disponible en France. Les acteurs locaux n'ont pas de ciblage cartographique en libre-service.",
  },
  {
    icon: "🚐",
    titre: "Vrais véhicules, vraies photos",
    desc: "Vous voyez les véhicules réels des propriétaires avant de réserver. Pas de maquette générée par IA, pas de rendu 3D fictif — le véhicule que vous choisissez est celui qui circulera avec votre pub.",
    vs: "La plupart des plateformes montrent des visualisations théoriques sans rapport avec la réalité terrain.",
  },
  {
    icon: "🤝",
    titre: "Revenus pour les propriétaires",
    desc: "Le modèle marketplace rémunère directement les propriétaires de véhicules (food trucks, taxis, vans, scooters de livraison). Plus de véhicules = plus de visibilité pour vous.",
    vs: "Les agences gardent la majorité de la marge. Chez MoveSpot, 70 % du revenu va directement au propriétaire.",
  },
  {
    icon: "🇫🇷",
    titre: "100 % France",
    desc: "Hébergement, support et équipe basés en France. Conformité RGPD native. Paiement en euros via Stripe 3D Secure.",
    vs: "Les acteurs US comme Wrapify ou Carvertise ne couvrent pas le marché français et ne respectent pas la réglementation européenne.",
  },
];

const COMPARATIF = [
  {
    label: "Délai de lancement",
    ms: "5 min",
    ag: "3–6 semaines",
    bb: "2–4 semaines",
    wr: "Non disponible",
  },
  { label: "Prix minimum", ms: "25 €/j", ag: "1 000 € +", bb: "500 €/sem", wr: "~15 $/j (US)" },
  { label: "Sans engagement", ms: "✓", ag: "✗", bb: "✗", wr: "✓ (US)" },
  { label: "Mesure GPS", ms: "✓", ag: "Estimée", bb: "✗", wr: "✓ (US)" },
  { label: "Ciblage zone libre-service", ms: "✓", ag: "✗", bb: "✗", wr: "✓ (US)" },
  { label: "Disponible en France", ms: "✓", ag: "✓", bb: "✓", wr: "✗" },
  { label: "PME & particuliers", ms: "✓", ag: "✗", bb: "✗", wr: "✗" },
  { label: "Revenus propriétaires (70 %)", ms: "✓", ag: "✗", bb: "✗", wr: "✓ (US)" },
];

function PourquoiMovespot() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-signal opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
            </span>
            Premier marketplace P2P de publicité mobile en France
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto">
            Pourquoi choisir
            <br />
            <span className="bg-gradient-signal bg-clip-text text-transparent">MoveSpot ?</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            La publicité mobile existe depuis longtemps. Ce qui change avec MoveSpot, c'est l'accès
            direct, la mesure en temps réel et un prix qui démocratise la visibilité pour toutes les
            entreprises.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow"
            >
              Créer mon compte gratuitement
            </Link>
            <Link
              to="/annonceur/briefs/nouveau"
              className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition"
            >
              Créer un brief sans compte
            </Link>
          </div>
          <dl className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { v: "< 5 min", l: "Délai de lancement" },
              { v: "25 €/j", l: "Prix minimum" },
              { v: "GPS", l: "Mesure d'audience" },
              { v: "70 %", l: "Reversé aux propriétaires" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-border bg-card/50 backdrop-blur p-4"
              >
                <dt className="font-display text-2xl font-bold text-primary">{s.v}</dt>
                <dd className="mt-1 text-xs text-muted-foreground">{s.l}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Avantages détaillés */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Nos avantages</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-12">Ce qui nous distingue</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {AVANTAGES.map((a) => (
            <div
              key={a.titre}
              className="rounded-2xl border border-border bg-gradient-card p-6 hover:border-primary/40 transition"
            >
              <div className="text-3xl mb-3">{a.icon}</div>
              <h3 className="font-display text-xl font-bold mb-2">{a.titre}</h3>
              <p className="text-sm text-foreground mb-3 leading-relaxed">{a.desc}</p>
              <div className="rounded-xl bg-secondary/60 px-4 py-3 text-xs text-muted-foreground border-l-2 border-muted">
                <span className="font-medium text-foreground">Comparé aux alternatives : </span>
                {a.vs}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparatif tableau */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Comparatif</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-8">
          MoveSpot vs la concurrence
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-5 text-muted-foreground font-medium bg-card/50 w-1/4"></th>
                <th className="py-4 px-5 font-bold text-center bg-primary/10 text-primary border-x border-border">
                  MoveSpot
                </th>
                <th className="py-4 px-5 text-muted-foreground font-medium text-center bg-card/50">
                  Agence trad.
                </th>
                <th className="py-4 px-5 text-muted-foreground font-medium text-center bg-card/50">
                  Billboard
                </th>
                <th className="py-4 px-5 text-muted-foreground font-medium text-center bg-card/50">
                  Wrapify (US)
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARATIF.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-border/50 ${i % 2 === 0 ? "bg-card/20" : ""}`}
                >
                  <td className="py-3 px-5 font-medium">{row.label}</td>
                  <td className="py-3 px-5 text-center font-semibold text-primary bg-primary/5 border-x border-border/30">
                    {row.ms}
                  </td>
                  <td className="py-3 px-5 text-center text-muted-foreground">{row.ag}</td>
                  <td className="py-3 px-5 text-center text-muted-foreground">{row.bb}</td>
                  <td className="py-3 px-5 text-center text-muted-foreground">{row.wr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Témoignages */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-xs uppercase tracking-widest text-primary mb-2">Témoignages</div>
        <h2 className="font-display text-3xl md:text-4xl font-bold mb-10">
          Ils ont choisi MoveSpot
        </h2>
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <p className="text-4xl mb-4">💬</p>
          <p className="font-semibold text-lg mb-2">Les premiers témoignages arrivent bientôt</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Vous avez utilisé MoveSpot pour votre campagne ? Nous serions ravis de partager votre
            expérience.
          </p>
          <a
            href="mailto:contact@move-spot.com?subject=Témoignage MoveSpot"
            className="inline-flex items-center gap-2 mt-6 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Partager mon expérience →
          </a>
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 px-8 py-12 text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Prêt à lancer votre campagne ?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Rejoignez les annonceurs qui ont choisi la publicité mobile sans agence. Compte gratuit,
            première campagne en 5 minutes.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow text-lg"
            >
              Créer mon compte gratuitement →
            </Link>
            <Link
              to="/"
              className="rounded-full border border-border bg-card px-6 py-3 font-medium hover:bg-secondary transition"
            >
              Voir les véhicules disponibles
            </Link>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} MoveSpot. Tous droits réservés.</div>
          <div className="flex flex-wrap gap-4">
            <Link to="/cgu" className="hover:text-foreground transition">
              CGU
            </Link>
            <Link to="/confidentialite" className="hover:text-foreground transition">
              Confidentialité
            </Link>
            <Link to="/comment-ca-marche" className="hover:text-foreground transition">
              Comment ça marche
            </Link>
            <Link to="/" className="hover:text-foreground transition">
              Accueil
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
