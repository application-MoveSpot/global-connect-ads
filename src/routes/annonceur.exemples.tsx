import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoLink } from "@/components/app/LogoLink";

export const Route = createFileRoute("/annonceur/exemples")({
  head: () => ({
    meta: [
      { title: "Ils ont fait confiance à MoveSpot" },
      {
        name: "description",
        content:
          "Des particuliers, associations et petits commerces qui ont utilisé la publicité mobile pour toucher leur quartier.",
      },
    ],
  }),
  component: ExemplesPage,
});

function ExemplesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link
            to="/annonceur/inscription"
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Lancer ma campagne →
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">
            Ils ont fait confiance à MoveSpot
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Des particuliers, associations et petits commerces qui ont utilisé la publicité mobile pour toucher leur quartier.
          </p>
        </div>

        {/* Témoignages à venir */}
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center mb-14">
          <p className="text-4xl mb-4">💬</p>
          <p className="font-semibold text-lg mb-2">Les premiers témoignages arrivent bientôt</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Vous avez utilisé MoveSpot pour votre campagne ? Nous serions ravis de partager votre expérience ici.
          </p>
          <a
            href="mailto:contact@move-spot.com?subject=Témoignage MoveSpot"
            className="inline-flex items-center gap-2 mt-6 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            Partager mon expérience →
          </a>
        </div>

        {/* CTA bas de page */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <p className="font-display text-2xl font-bold mb-2">Prêt à lancer votre campagne ?</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Créez un brief en 5 minutes. Les propriétaires de votre zone reçoivent votre demande et vous proposent leurs véhicules.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Créer mon compte gratuit →
            </Link>
            <Link
              to="/annonceur/briefs/nouveau"
              className="rounded-full border border-border bg-card text-foreground px-6 py-3 text-sm font-medium hover:bg-secondary transition-colors"
            >
              Créer un brief
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Dès 49 € · sans abonnement · annulation gratuite sous 72h
          </p>
        </div>
      </main>
    </div>
  );
}
