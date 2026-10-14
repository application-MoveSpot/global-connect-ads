import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { getPublicCampaignInfo } from "@/lib/campaigns/public-campaign.functions";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/c/$campaignId")({
  head: () => ({
    meta: [
      { title: "Cette pub roule avec MoveSpot" },
      {
        name: "description",
        content:
          "Vous venez de croiser un véhicule MoveSpot. Découvrez la publicité mobile sur véhicules.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: PublicCampaignPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type State = { loading: boolean; found: boolean; company?: string; spotName?: string };

function PublicCampaignPage() {
  const { t } = useTranslation();
  const { campaignId } = Route.useParams();
  const fetchInfo = useServerFn(getPublicCampaignInfo);
  const [state, setState] = useState<State>({ loading: true, found: false });

  useEffect(() => {
    fetchInfo({ data: { campaignRequestId: campaignId } })
      .then((r: { found: boolean; company?: string; spotName?: string }) =>
        setState({ loading: false, found: r.found, company: r.company, spotName: r.spotName }),
      )
      .catch(() => setState({ loading: false, found: false }));
  }, [campaignId, fetchInfo]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">
          🚗
        </div>
        {state.loading ? null : state.found ? (
          <>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {state.company ? (
                <>
                  {t("campaign_qr.crossed_company", { company: "" })}
                  <span className="text-primary">{state.company}</span>
                </>
              ) : (
                t("campaign_qr.crossed_company", { company: t("campaign_qr.crossed_ad") })
              )}
            </h1>
            <p className="mt-4 text-muted-foreground">
              {state.spotName
                ? t("campaign_qr.campaign_name", { name: state.spotName })
                : t("campaign_qr.ad_runs")}{" "}
              {t("campaign_qr.by_movespot")}
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              {t("campaign_qr.title_fallback")}
            </h1>
            <p className="mt-4 text-muted-foreground">{t("campaign_qr.subtitle_fallback")}</p>
          </>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/advertiser/inscription"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("campaign_qr.cta_advertise")}
          </Link>
          <Link
            to="/comment-ca-marche"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary/50"
          >
            {t("campaign_qr.cta_how")}
          </Link>
        </div>
      </main>
    </div>
  );
}
