import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sentry } from "@/lib/sentry";

export function RouteError({ error }: { error: Error }) {
  const { t } = useTranslation();
  Sentry.captureException(error);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-5xl font-bold text-muted-foreground/30">!</p>
      <h2 className="mt-4 text-xl font-semibold text-foreground">{t("errors.title")}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {error.message || t("common.error")}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {t("errors.reload")}
        </button>
        <Link
          to="/"
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
        >
          {t("common.home")}
        </Link>
      </div>
    </div>
  );
}
