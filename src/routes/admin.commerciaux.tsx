import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";

import {
  listCommercialsForAdmin,
  type CommercialProfile,
} from "@/lib/commercial/commercial.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/commerciaux")({
  head: () => ({
    meta: [
      { title: "Commerciaux — Admin MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminCommerciauxPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

function AdminCommerciauxPage() {
  const { t, i18n } = useTranslation();
  const listFn = useServerFn(listCommercialsForAdmin);
  const [rows, setRows] = useState<CommercialProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listFn({ data: {} })
      .then((res: any) => {
        if (res.ok) setRows(res.commercials);
      })
      .catch((e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [listFn]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">{t("admin.commerciaux.title")}</h1>
          </div>
          <Link
            to="/admin"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {t("admin.back")}
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-muted-foreground text-sm">{t("admin.commerciaux.loading")}</div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-muted-foreground text-sm">{t("admin.commerciaux.empty")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-border bg-card px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{r.full_name}</p>
                    {r.company && (
                      <span className="text-xs text-muted-foreground">{r.company}</span>
                    )}
                    {!r.active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/30">
                        {t("admin.commerciaux.inactive")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Code : <strong className="font-mono text-foreground">{r.referral_code}</strong>
                    {r.city && <> · {r.city}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {Math.round(r.commission_rate * 100)} {t("admin.commerciaux.commission")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("admin.commerciaux.since", {
                      date: new Date(r.created_at).toLocaleDateString(i18n.language),
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
