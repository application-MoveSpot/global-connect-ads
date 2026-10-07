import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/annonceur/briefs/")({
  head: () => ({
    meta: [
      { title: "Mes briefs — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: BriefsListPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Brief = {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  vehicle_types: string[];
  zones: string[];
  created_at: string;
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function BriefsListPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.resolvedLanguage === "en" ? "en-US" : "fr-FR";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [accountType, setAccountType] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/annonceur/inscription" }); return; }
      const [{ data: bs }, { data: prof }] = await Promise.all([
        supabase
          .from("advertiser_briefs")
          .select("id, title, status, start_date, end_date, vehicle_types, zones, created_at")
          .eq("advertiser_id", sess.session.user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("advertiser_profiles")
          .select("account_type")
          .eq("user_id", sess.session.user.id)
          .maybeSingle(),
      ]);
      const list = (bs as Brief[]) ?? [];
      setBriefs(list);
      setAccountType((prof as { account_type?: string } | null)?.account_type ?? null);
      if (list.length > 0) {
        const { data: ps } = await supabase
          .from("brief_proposals")
          .select("brief_id")
          .in("brief_id", list.map((b) => b.id));
        const c: Record<string, number> = {};
        for (const p of ps ?? []) c[p.brief_id] = (c[p.brief_id] ?? 0) + 1;
        setCounts(c);
      }
      setLoading(false);
    })();
  }, [navigate]);

  const isIndividual = accountType === "individual";

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("annonceur.briefs_list.loading")}</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">{t("annonceur.briefs_list.back")}</Link>
        </div>
      </header>
      <main id="main-content" className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold">{t("annonceur.briefs_list.title")}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isIndividual ? t("annonceur.briefs_list.subtitle_individual") : t("annonceur.briefs_list.subtitle_business")}
            </p>
          </div>
          <Link to="/annonceur/briefs/nouveau"
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition">
            + {isIndividual ? t("annonceur.briefs_list.new_individual") : t("annonceur.briefs_list.new_business")}
          </Link>
        </div>

        {briefs.length === 0 ? (
          isIndividual ? (
            <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-10 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="font-semibold mb-1">{t("annonceur.briefs_list.empty_ind_title")}</p>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                {t("annonceur.briefs_list.empty_ind_desc")}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/annonceur/briefs/nouveau"
                  className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 transition">
                  {t("annonceur.briefs_list.empty_ind_cta")}
                </Link>
                <Link to="/annonceur/pack"
                  className="rounded-full border border-primary/40 text-primary px-4 py-2 text-sm font-medium hover:bg-primary/10 transition">
                  {t("annonceur.briefs_list.empty_ind_packs")}
                </Link>
                <Link to="/annonceur/exemples"
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary transition">
                  {t("annonceur.briefs_list.empty_ind_examples")}
                </Link>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
              <p className="text-muted-foreground mb-4">{t("annonceur.briefs_list.empty_biz")}</p>
              <Link to="/annonceur/briefs/nouveau" className="text-primary font-semibold hover:underline">{t("annonceur.briefs_list.empty_biz_cta")}</Link>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {briefs.map((b) => {
              const d = daysUntil(b.start_date);
              const upcoming = b.status === "open" && d > 0;
              return (
                <Link key={b.id} to="/annonceur/briefs/$briefId" params={{ briefId: b.id }}
                  className="block rounded-xl border border-border bg-card p-5 hover:bg-secondary/30 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-semibold">{b.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {t("annonceur.briefs_list.date_from", { from: new Date(b.start_date).toLocaleDateString(dateLocale), to: new Date(b.end_date).toLocaleDateString(dateLocale) })}
                        {b.zones.length > 0 && <> · {b.zones.slice(0, 3).join(", ")}{b.zones.length > 3 ? "…" : ""}</>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{t("annonceur.briefs_list.types_label")} {b.vehicle_types.join(", ")}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={b.status} />
                      <span className="text-xs text-muted-foreground">{t("annonceur.briefs_list.proposals", { count: counts[b.id] ?? 0 })}</span>
                      {upcoming && (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${d <= 7 ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "bg-primary/10 text-primary"}`}>
                          J-{d}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const clsMap: Record<string, string> = {
    open: "bg-signal/20 text-signal",
    closed: "bg-secondary text-foreground",
    fulfilled: "bg-primary/20 text-primary",
    cancelled: "bg-destructive/15 text-destructive",
  };
  const cls = clsMap[status] ?? "bg-secondary";
  const label = t(`annonceur.briefs_list.status_${status}` as never, { defaultValue: status });
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{label}</span>;
}
