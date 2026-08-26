import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LogoLink } from "@/components/app/LogoLink";
import { getPublicCampaignInfo } from "@/lib/campaigns/public-campaign.functions";

export const Route = createFileRoute("/c/$campaignId")({
  head: () => ({
    meta: [
      { title: "Cette pub roule avec MoveSpot" },
      {
        name: "description",
        content: "Vous venez de croiser un véhicule MoveSpot. Découvrez la publicité mobile sur véhicules.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: PublicCampaignPage,
});

type State = { loading: boolean; found: boolean; company?: string; spotName?: string };

function PublicCampaignPage() {
  const { campaignId } = Route.useParams();
  const fetchInfo = useServerFn(getPublicCampaignInfo);
  const [state, setState] = useState<State>({ loading: true, found: false });

  useEffect(() => {
    fetchInfo({ data: { campaignRequestId: campaignId } })
      .then((r: { found: boolean; company?: string; spotName?: string }) => setState({ loading: false, found: r.found, company: r.company, spotName: r.spotName }))
      .catch(() => setState({ loading: false, found: false }));
  }, [campaignId, fetchInfo]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <LogoLink />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">
          🚗
        </div>
        {state.loading ? null : state.found ? (
          <>
            <h1 className="font-display text-3xl md:text-4xl font-bold">
              Vous venez de croiser {state.company ? <span className="text-primary">{state.company}</span> : "une pub"}
            </h1>
            <p className="mt-4 text-muted-foreground">
              {state.spotName ? `Campagne « ${state.spotName} » — propulsée` : "Cette publicité roule"} par{" "}
              <strong>MoveSpot</strong>, le réseau de publicité mobile sur véhicules.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-3xl md:text-4xl font-bold">Cette pub roule avec MoveSpot</h1>
            <p className="mt-4 text-muted-foreground">
              Le réseau de publicité mobile sur véhicules : taxis, VTC, vans, food trucks…
            </p>
          </>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            to="/annonceur/inscription"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Je veux annoncer sur un véhicule
          </Link>
          <Link
            to="/comment-ca-marche"
            className="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold hover:bg-secondary/50"
          >
            Comment ça marche
          </Link>
        </div>
      </main>
    </div>
  );
}
