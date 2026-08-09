import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoLink } from "@/components/LogoLink";

export const Route = createFileRoute("/annonceur/essai-active")({
  head: () => ({
    meta: [
      { title: "Essai gratuit activé — MoveSpot" },
      {
        name: "description",
        content:
          "Votre essai gratuit de 14 jours MoveSpot est activé et votre campagne de publicité mobile est en cours de déploiement.",
      },
      { property: "og:title", content: "Essai gratuit activé — MoveSpot" },
      {
        property: "og:description",
        content: "Votre essai gratuit de 14 jours est activé, votre campagne est en cours de déploiement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: TrialActivatedPage,
});

function TrialActivatedPage() {
  const { session_id: sessionId } = Route.useSearch();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">
            ← Mon tableau de bord
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        <div className="rounded-2xl border border-signal/40 bg-signal/10 p-8 text-center">
          <div className="text-4xl mb-4" aria-hidden="true">
            🎉
          </div>
          <h1 className="font-display text-3xl font-bold">Félicitations, votre essai gratuit est activé !</h1>
          <p className="mt-3 text-muted-foreground">Votre campagne est en cours de déploiement.</p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/annonceur"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Suivre ma campagne
            </Link>
            <Link
              to="/annonceur/briefs"
              className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary/50"
            >
              Mes briefs
            </Link>
          </div>

          {sessionId ? (
            <p className="mt-6 text-xs text-muted-foreground break-all">Référence de souscription : {sessionId}</p>
          ) : null}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">Et maintenant ?</p>
          <p>
            Aucun prélèvement pendant 14 jours. La pose du covering est planifiée avec le prestataire, puis le suivi GPS
            et les impressions estimées apparaissent dans votre tableau de bord.
          </p>
        </div>
      </main>
    </div>
  );
}
