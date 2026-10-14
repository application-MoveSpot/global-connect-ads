import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrRefreshSession } from "@/integrations/supabase/session";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { CheckCircle, Clock, Star, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/advertiser/briefs/confirmation/$briefId")({
  head: () => ({
    meta: [
      { title: "Annonce publiée — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: ConfirmationPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function daysUntil(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function ConfirmationPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language;
  const fmtDate = (d: string | null | undefined) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(dateLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  const { briefId } = Route.useParams();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<{
    title?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    zones?: string[] | null;
  } | null>(null);
  const [isIndividual, setIsIndividual] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const session = await getOrRefreshSession();
      if (!session) {
        navigate({ to: "/advertiser/inscription" });
        return;
      }
      const [briefRes, profileRes] = await Promise.allSettled([
        supabase
          .from("advertiser_briefs")
          .select("title, start_date, end_date, zones")
          .eq("id", briefId)
          .maybeSingle(),
        supabase
          .from("advertiser_profiles")
          .select("account_type")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);
      if (briefRes.status === "fulfilled") {
        setBrief(briefRes.value.data as typeof brief);
      }
      if (profileRes.status === "fulfilled") {
        const p = profileRes.value.data as { account_type?: string } | null;
        setIsIndividual(p?.account_type === "individual");
      }
      setLoading(false);
    })();
  }, [briefId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("advertiser.briefs_confirm.loading")}
      </div>
    );
  }

  const days = daysUntil(brief?.start_date);
  const urgent = days !== null && days >= 0 && days <= 7;
  const zoneLabel = brief?.zones?.length ? brief.zones[0] : null;
  const daysStr =
    days === 0
      ? t("advertiser.briefs_confirm.urgent_days_zero")
      : t("advertiser.briefs_confirm.urgent_days" as never, { count: days ?? 0 });

  const STEPS = [
    { icon: "📬", key: "step1" as const },
    { icon: "👀", key: "step2" as const },
    { icon: "✅", key: "step3" as const },
    { icon: "🚗", key: "step4" as const },
  ];

  if (isIndividual) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <LogoLink />
            <Link to="/advertiser" className="text-sm text-muted-foreground hover:text-foreground">
              {t("advertiser.briefs_confirm.back")}
            </Link>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-4xl mb-3">🎉</div>
            <h1 className="font-display text-3xl font-bold mb-2">
              {t("advertiser.briefs_confirm.ind_title")}
            </h1>
            <p className="text-muted-foreground">{t("advertiser.briefs_confirm.ind_desc")}</p>
          </div>

          {urgent && days !== null && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 mb-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-900 dark:text-amber-200">
                <strong>{t("advertiser.briefs_confirm.urgent_intro", { days: daysStr })}</strong>{" "}
                {t("advertiser.briefs_confirm.urgent_body_cta")}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-6 mb-6 space-y-3">
            <h2 className="font-display font-bold text-lg mb-1">
              {t("advertiser.briefs_confirm.summary_title")}
            </h2>
            {brief?.title && (
              <Row label={t("advertiser.briefs_confirm.row_title")} value={brief.title} />
            )}
            {brief?.start_date && (
              <Row
                label={t("advertiser.briefs_confirm.row_start")}
                value={fmtDate(brief.start_date)!}
              />
            )}
            {brief?.end_date && (
              <Row
                label={t("advertiser.briefs_confirm.row_end")}
                value={fmtDate(brief.end_date)!}
              />
            )}
            {zoneLabel && <Row label={t("advertiser.briefs_confirm.row_zone")} value={zoneLabel} />}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 mb-6">
            <h2 className="font-display font-bold text-lg mb-4">
              {t("advertiser.briefs_confirm.next_title")}
            </h2>
            <ol className="space-y-4">
              {STEPS.map(({ icon, key }, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-base">
                    {icon}
                  </span>
                  <span className="text-muted-foreground pt-0.5">
                    {t(`advertiser.briefs_confirm.${key}`)}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-8 flex items-start gap-3">
            <Star className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p
              className="text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: t("advertiser.briefs_confirm.tip") }}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/advertiser/briefs/$briefId"
              params={{ briefId }}
              className="flex-1 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold text-center hover:bg-primary/90 transition"
            >
              {t("advertiser.briefs_confirm.cta_brief")}
            </Link>
            <Link
              to="/advertiser"
              className="flex-1 rounded-full border border-border bg-card px-6 py-3 font-semibold text-center hover:bg-secondary transition"
            >
              {t("advertiser.briefs_confirm.cta_home")}
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // Version entreprise
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/advertiser" className="text-sm text-muted-foreground hover:text-foreground">
            {t("advertiser.briefs_confirm.back")}
          </Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 mb-6">
          <Zap className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="font-display text-3xl font-bold mb-3">
          {t("advertiser.briefs_confirm.biz_title")}
        </h1>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          {t("advertiser.briefs_confirm.biz_desc")}
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 mb-8 text-left space-y-3">
          {brief?.title && (
            <Row label={t("advertiser.briefs_confirm.biz_row_name")} value={brief.title} />
          )}
          {brief?.start_date && (
            <Row
              label={t("advertiser.briefs_confirm.biz_row_start")}
              value={fmtDate(brief.start_date)!}
            />
          )}
          {brief?.end_date && (
            <Row
              label={t("advertiser.briefs_confirm.biz_row_end")}
              value={fmtDate(brief.end_date)!}
            />
          )}
          {zoneLabel && (
            <Row label={t("advertiser.briefs_confirm.biz_row_zone")} value={zoneLabel} />
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/advertiser/briefs/$briefId"
            params={{ briefId }}
            className="rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:bg-primary/90 transition"
          >
            {t("advertiser.briefs_confirm.biz_cta_brief")}
          </Link>
          <Link
            to="/advertiser"
            className="rounded-full border border-border bg-card px-6 py-3 font-semibold hover:bg-secondary transition"
          >
            {t("advertiser.briefs_confirm.biz_cta_home")}
          </Link>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
