import { Link } from "@tanstack/react-router";
import { Sentry } from "@/lib/sentry";

export function RouteError({ error }: { error: Error }) {
  Sentry.captureException(error);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-5xl font-bold text-muted-foreground/30">!</p>
      <h2 className="mt-4 text-xl font-semibold text-foreground">Une erreur est survenue</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {error.message || "Quelque chose s'est mal passé sur cette page."}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Recharger
        </button>
        <Link
          to="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
