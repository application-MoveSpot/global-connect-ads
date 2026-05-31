import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/devenir-partenaire")({
  head: () => ({
    meta: [
      { title: "Devenir partenaire MoveSpot — Rentabilisez votre véhicule" },
      { name: "description", content: "Vous avez un food truck, van, taxi ou scooter de livraison ? Inscrivez-vous sur MoveSpot et générez un revenu complémentaire en louant vos espaces publicitaires." },
      { property: "og:title", content: "Devenir partenaire MoveSpot" },
      { property: "og:description", content: "Rentabilisez les kilomètres parcourus par votre véhicule en proposant vos espaces publicitaires." },
    ],
  }),
  component: DevenirPartenaire,
});

function DevenirPartenaire() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-display font-bold text-lg tracking-tight">MoveSpot</Link>
          <Link to="/proprietaire/inscription" className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition">
            S'inscrire
          </Link>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur px-4 py-1.5 text-xs font-medium mb-6">
          🚐 Espace propriétaires
        </div>
        <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
          Vos kilomètres,<br />
          <span className="bg-gradient-signal bg-clip-text text-transparent">votre nouveau revenu.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Propriétaire d'un food truck, van, taxi, scooter ou flotte de véhicules ? Proposez vos espaces publicitaires sur MoveSpot et générez un revenu passif sur vos trajets quotidiens.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link to="/proprietaire/inscription" className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
            Créer mon espace propriétaire
          </Link>
          <Link to="/proprietaire" className="rounded-full border border-border bg-card/50 backdrop-blur px-6 py-3 font-semibold hover:bg-card transition">
            J'ai déjà un compte
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { n: "01", t: "Créez votre profil", d: "Inscription en 2 minutes. Renseignez vos informations et ajoutez votre premier véhicule avec photos." },
            { n: "02", t: "Validation par MoveSpot", d: "Notre équipe vérifie votre véhicule sous 48h pour garantir la qualité de la marketplace." },
            { n: "03", t: "Recevez des campagnes", d: "Les annonceurs vous contactent. Vous acceptez ou refusez chaque demande, et empochez le revenu." },
          ].map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
              <div className="text-xs font-mono text-primary mb-2">{s.n}</div>
              <h3 className="font-display text-xl font-bold mb-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Quels véhicules ?</h2>
        <div className="flex flex-wrap gap-3 justify-center">
          {["Food truck", "Van utilitaire", "Taxi / VTC", "Scooter livraison", "Voiture", "Flotte d'entreprise"].map((v) => (
            <span key={v} className="rounded-full border border-border bg-card px-5 py-2 text-sm font-medium">{v}</span>
          ))}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Prêt à monétiser vos trajets ?</h2>
        <Link to="/proprietaire/inscription" className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
          Commencer maintenant
        </Link>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MoveSpot
        </div>
      </footer>
    </div>
  );
}
