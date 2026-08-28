import { createFileRoute, Link } from "@tanstack/react-router";
import { hreflangLinks } from "@/lib/seo";
import { LogoLink } from "@/components/app/LogoLink";
import { FAQChatbot } from "@/components/app/FAQChatbot";

export const Route = createFileRoute("/devenir-partenaire")({
  head: () => ({
    meta: [
      { title: "Devenir partenaire MoveSpot — Rentabilisez votre véhicule" },
      { name: "description", content: "Vous avez un food truck, van, taxi ou scooter de livraison ? Inscrivez-vous sur MoveSpot et générez un revenu complémentaire en louant vos espaces publicitaires." },
      { property: "og:title", content: "Devenir partenaire MoveSpot" },
      { property: "og:description", content: "Rentabilisez les kilomètres parcourus par votre véhicule en proposant vos espaces publicitaires." },
    ],
    links: [{ rel: "canonical", href: "https://move-spot.com/devenir-partenaire" }, ...hreflangLinks("/devenir-partenaire")],
  }),
  component: DevenirPartenaire,
});

function DevenirPartenaire() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-background/70 border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
           <LogoLink />
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
            { n: "02", t: "Validation par MoveSpot", d: "MoveSpot vérifie votre véhicule sous 48h pour garantir la qualité de la marketplace." },
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

      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 md:p-8">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden>⚠️</span>
            <div className="space-y-3">
              <h2 className="font-display text-xl md:text-2xl font-bold">
                Publicité extérieure : ce que dit la réglementation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                L'affichage publicitaire sur véhicules et dans l'espace public est encadré par le Code de
                l'environnement (articles L.581-1 et suivants) et le règlement local de publicité (RLP) de chaque commune.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                <li>
                  La <strong>publicité lumineuse</strong> est interdite dans les agglomérations de moins de
                  10 000 habitants ne faisant pas partie d'une unité urbaine de plus de 100 000 habitants.
                </li>
                <li>
                  La publicité est interdite sur les <strong>immeubles classés ou inscrits</strong>, monuments
                  historiques, arbres, et dans les sites protégés (parcs nationaux, réserves naturelles).
                </li>
                <li>
                  Les <strong>véhicules utilisés ou équipés principalement à des fins publicitaires</strong> ne
                  peuvent pas stationner ou circuler dans certaines zones (article R.581-48 du Code de
                  l'environnement).
                </li>
                <li>
                  Les formats, surfaces et emplacements doivent respecter le <strong>RLP de la commune</strong>{" "}
                  concernée.
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Source :{" "}
                <a
                  href="https://www.service-public.fr/professionnels-entreprises/vosdroits/F22397"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  service-public.fr — Réglementation de la publicité extérieure
                </a>
                . MoveSpot vérifie chaque campagne pour garantir sa conformité.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Prêt à monétiser vos trajets ?</h2>
        <Link to="/proprietaire/inscription" className="inline-block mt-4 rounded-full bg-primary text-primary-foreground px-8 py-3 font-semibold hover:bg-primary/90 transition shadow-glow">
          Commencer maintenant
        </Link>
        <p className="text-sm text-muted-foreground mt-8">
          Vous êtes apporteur d'affaires, agence ou revendeur ?{" "}
          <Link to="/partenaire/inscription" className="underline hover:text-foreground">
            Rejoignez le programme partenaire
          </Link>
          .
        </p>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-muted-foreground text-center">
          © {new Date().getFullYear()} MoveSpot
        </div>
      </footer>
      <FAQChatbot
        audience="proprietaire"
        suggestions={[
          "Quels véhicules puis-je inscrire ?",
          "Combien je peux gagner par mois ?",
          "Combien de temps prend la validation de mon véhicule ?",
          "Que dit la réglementation sur la pub mobile ?",
        ]}
      />
    </div>
  );
}
