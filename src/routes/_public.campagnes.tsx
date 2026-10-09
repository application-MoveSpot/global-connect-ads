import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getPublicActiveCampaigns } from "@/lib/campaigns/rating.functions";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/_public/campagnes")({
  head: () => ({
    meta: [
      { title: "Campagnes en cours — MoveSpot" },
      { name: "description", content: "Découvrez les campagnes publicitaires mobiles actives sur MoveSpot." },
      { property: "og:title", content: "Campagnes MoveSpot en cours" },
    ],
  }),
  component: CampagnesPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Campaign = {
  id: string;
  spotName: string;
  location: string | null;
  impressionsPerDay: number | null;
  daysCount: number | null;
  startDate: string;
  endDate: string;
  vehicleType: string | null;
  format: string | null;
  zoneCount: number;
};

function CampagnesPage() {
  const { t } = useTranslation();
  const fetchCampaigns = useServerFn(getPublicActiveCampaigns);
  const { data, isLoading } = useQuery({
    queryKey: ["public-campaigns"],
    queryFn: () => fetchCampaigns(),
    staleTime: 5 * 60_000,
  });

  const campaigns: Campaign[] = data?.campaigns ?? [];

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="font-display text-4xl font-bold mb-3">{t("campaigns.page.title")}</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("campaigns.page.subtitle")}
            {campaigns.length > 0 && (
              <span> <strong>{campaigns.length}</strong> {t(`campaigns.page.active_count_${campaigns.length > 1 ? "other" : "one"}`, { count: campaigns.length })}</span>
            )}
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg font-semibold">{t("campaigns.page.empty_title")}</p>
            <p className="text-sm mt-2">{t("campaigns.page.empty_hint")}</p>
            <Link
              to="/annonceur/inscription"
              className="inline-block mt-6 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition"
            >
              {t("campaigns.page.start_cta")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}

        <div className="mt-16 rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="font-display text-2xl font-bold mb-3">{t("campaigns.page.join_title")}</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
            {t("campaigns.page.join_subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/annonceur/inscription"
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition"
            >
              {t("campaigns.page.join_advertiser")}
            </Link>
            <Link
              to="/proprietaire/inscription"
              className="rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold hover:bg-secondary transition"
            >
              {t("campaigns.page.join_owner")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function CampaignCard({ campaign: c }: { campaign: Campaign }) {
  const { t, i18n } = useTranslation();
  const totalImpressions = (c.impressionsPerDay ?? 0) * (c.daysCount ?? 1);
  const endDate = new Date(c.endDate);
  const today = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
  const vehicleLabel = c.vehicleType
    ? t(`campaigns.vehicle.${c.vehicleType}`, { defaultValue: `🚗 ${c.vehicleType}` })
    : t("campaigns.card.vehicle_fallback");

  return (
    <div className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base leading-tight">{c.spotName}</h3>
        <span className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-full px-2 py-0.5 shrink-0 font-medium">
          {t("campaigns.card.active_badge")}
        </span>
      </div>

      {c.location && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span>📍</span> {c.location}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <span className="text-xs bg-secondary rounded-full px-2 py-0.5">{vehicleLabel}</span>
        {c.zoneCount > 0 && (
          <span className="text-xs bg-secondary rounded-full px-2 py-0.5">
            {t(`campaigns.card.zones_${c.zoneCount > 1 ? "other" : "one"}`, { count: c.zoneCount })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        {totalImpressions > 0 && (
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("campaigns.card.impressions_label")}</p>
            <p className="font-bold text-sm">{totalImpressions.toLocaleString(i18n.language)}</p>
          </div>
        )}
        {daysLeft > 0 && (
          <div className="rounded-lg bg-muted/40 p-2 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("campaigns.card.days_left_label")}</p>
            <p className="font-bold text-sm">{daysLeft}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-auto">
        {new Date(c.startDate).toLocaleDateString(i18n.language, { day: "numeric", month: "short" })}
        {" – "}
        {new Date(c.endDate).toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}
