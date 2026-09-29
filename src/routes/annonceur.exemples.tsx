import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoLink } from "@/components/app/LogoLink";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/annonceur/exemples")({
  head: () => ({
    meta: [
      { title: "They trusted MoveSpot | Ils ont fait confiance à MoveSpot" },
      {
        name: "description",
        content:
          "Individuals, associations and small businesses who used mobile advertising to reach their neighbourhood.",
      },
    ],
  }),
  component: ExemplesPage,
});

const CONTENT = {
  fr: {
    header_cta: "Lancer ma campagne →",
    h1: "Ils ont fait confiance à MoveSpot",
    desc: "Des particuliers, associations et petits commerces qui ont utilisé la publicité mobile pour toucher leur quartier.",
    soon_title: "Les premiers témoignages arrivent bientôt",
    soon_desc: "Vous avez utilisé MoveSpot pour votre campagne ? Nous serions ravis de partager votre expérience ici.",
    soon_cta: "Partager mon expérience →",
    cta_h2: "Prêt à lancer votre campagne ?",
    cta_desc: "Créez un brief en 5 minutes. Les propriétaires de votre zone reçoivent votre demande et vous proposent leurs véhicules.",
    cta_primary: "Créer mon compte gratuit →",
    cta_brief: "Créer un brief",
    cta_note: "Dès 49 € · sans abonnement · annulation gratuite sous 72h",
  },
  en: {
    header_cta: "Launch my campaign →",
    h1: "They trusted MoveSpot",
    desc: "Individuals, associations and small businesses who used mobile advertising to reach their neighbourhood.",
    soon_title: "First testimonials coming soon",
    soon_desc: "Have you used MoveSpot for your campaign? We'd love to share your experience here.",
    soon_cta: "Share my experience →",
    cta_h2: "Ready to launch your campaign?",
    cta_desc: "Create a brief in 5 minutes. Owners in your area receive your request and offer their vehicles.",
    cta_primary: "Create my free account →",
    cta_brief: "Create a brief",
    cta_note: "From €49 · no subscription · free cancellation within 72h",
  },
};

function ExemplesPage() {
  const { i18n } = useTranslation();
  const c = i18n.language === "en" ? CONTENT.en : CONTENT.fr;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link
            to="/annonceur/inscription"
            className="rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {c.header_cta}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">{c.h1}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">{c.desc}</p>
        </div>

        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center mb-14">
          <p className="text-4xl mb-4">💬</p>
          <p className="font-semibold text-lg mb-2">{c.soon_title}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{c.soon_desc}</p>
          <a
            href="mailto:contact@move-spot.com?subject=Témoignage MoveSpot"
            className="inline-flex items-center gap-2 mt-6 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium hover:bg-secondary transition-colors"
          >
            {c.soon_cta}
          </a>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8 text-center">
          <p className="font-display text-2xl font-bold mb-2">{c.cta_h2}</p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">{c.cta_desc}</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {c.cta_primary}
            </Link>
            <Link
              to="/annonceur/briefs/nouveau"
              className="rounded-full border border-border bg-card text-foreground px-6 py-3 text-sm font-medium hover:bg-secondary transition-colors"
            >
              {c.cta_brief}
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">{c.cta_note}</p>
        </div>
      </main>
    </div>
  );
}
