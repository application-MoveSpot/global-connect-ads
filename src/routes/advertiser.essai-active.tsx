import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LogoLink } from "@/components/app/LogoLink";
import { verifyCampaignSubscriptionSession } from "@/lib/payments/payments.functions";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/advertiser/essai-active")({
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
        content:
          "Votre essai gratuit de 14 jours est activé, votre campagne est en cours de déploiement.",
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
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type VerifyState =
  | { phase: "checking" }
  | { phase: "ok"; status: string; trialEnd: string | null }
  | { phase: "error"; message: string };

function TrialActivatedPage() {
  const { t } = useTranslation();
  const { session_id: sessionId } = Route.useSearch();
  const verifySession = useServerFn(verifyCampaignSubscriptionSession);
  const [state, setState] = useState<VerifyState>({ phase: "checking" });

  useEffect(() => {
    if (!sessionId) {
      setState({ phase: "error", message: t("advertiser.essai_active.error_missing_id") });
      return;
    }
    verifySession({ data: { sessionId } })
      .then((r: any) => {
        if ("error" in r) {
          setState({
            phase: "error",
            message: r.error || t("advertiser.essai_active.error_verify"),
          });
          return;
        }
        setState({ phase: "ok", status: r.status, trialEnd: r.trialEnd ?? null });
      })
      .catch(() =>
        setState({ phase: "error", message: t("advertiser.essai_active.error_verify") }),
      );
  }, [sessionId, verifySession, t]);

  const active = state.phase === "ok" && (state.status === "trialing" || state.status === "active");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border light-band">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/advertiser" className="text-sm text-muted-foreground hover:text-foreground">
            {t("advertiser.essai_active.back")}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-16">
        {state.phase === "checking" ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("advertiser.essai_active.checking")}
          </div>
        ) : state.phase === "error" ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center">
            <div className="text-4xl mb-4" aria-hidden="true">
              ⚠️
            </div>
            <h1 className="font-display text-2xl font-bold">
              {t("advertiser.essai_active.error_title")}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">{state.message}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/advertiser"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t("advertiser.essai_active.error_back")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-signal/40 bg-signal/10 p-8 text-center">
            <div className="text-4xl mb-4" aria-hidden="true">
              {active ? "🎉" : "⏳"}
            </div>
            <h1 className="font-display text-3xl font-bold">
              {active
                ? t("advertiser.essai_active.success_title")
                : t("advertiser.essai_active.pending_title")}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {active
                ? t("advertiser.essai_active.success_body")
                : t("advertiser.essai_active.pending_body")}
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/advertiser"
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                {t("advertiser.essai_active.cta_campaign")}
              </Link>
              <Link
                to="/advertiser/briefs"
                className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary/50"
              >
                {t("advertiser.essai_active.cta_briefs")}
              </Link>
            </div>

            {sessionId ? (
              <p className="mt-6 text-xs text-muted-foreground break-all">
                {t("advertiser.essai_active.ref_label")} {sessionId}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">
            {t("advertiser.essai_active.next_title")}
          </p>
          <p>{t("advertiser.essai_active.next_body")}</p>
        </div>
      </main>
    </div>
  );
}
