import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  listBankTransfersForAdmin,
  reviewBankTransfer,
} from "@/lib/payments/bank-transfers.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { Button } from "@/components/ui/button";
import { RouteError } from "@/components/app/RouteError";

export const Route = createFileRoute("/admin/virements")({
  head: () => ({
    meta: [
      { title: "Virements bancaires — Admin MoveSpot" },
      {
        name: "description",
        content: "Validation des recharges de portefeuille par virement bancaire.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminBankTransfers,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Row = {
  id: string;
  reference: string;
  amount_cents: number;
  status: string;
  receipt_url: string | null;
  admin_notes: string | null;
  created_at: string;
  campaign_request_id: string | null;
};

function fmt(cents: number, lang: string) {
  return (cents / 100).toLocaleString(lang, { style: "currency", currency: "EUR" });
}

function AdminBankTransfers() {
  const { t, i18n } = useTranslation();
  const fetchRows = useServerFn(listBankTransfersForAdmin);
  const review = useServerFn(reviewBankTransfer);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setRows((await fetchRows()) as Row[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onReview = async (id: string, approve: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const notes = approve
        ? undefined
        : (window.prompt(t("admin.virements.reject_reason")) ?? undefined);
      await review({ data: { requestId: id, approve, notes } });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <LogoLink />
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            {t("admin.back")}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <h1 className="font-display text-3xl font-bold">{t("admin.virements.title")}</h1>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {t("admin.virements.empty")}
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">
                      {fmt(row.amount_cents, i18n.language)} ·{t("admin.virements.ref")}{" "}
                      <span className="font-mono">{row.reference}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString(i18n.language)} —{" "}
                      {t("admin.virements.status")} : {row.status}
                    </div>
                    {row.campaign_request_id ? (
                      <div className="text-xs text-primary">
                        {t("admin.virements.campaign_payment")}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {t("admin.virements.wallet_topup")}
                      </div>
                    )}
                    {row.admin_notes ? (
                      <div className="text-xs text-muted-foreground">
                        {t("admin.virements.note")} : {row.admin_notes}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {row.receipt_url ? (
                      <a
                        href={row.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        {t("admin.virements.see_receipt")}
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("admin.virements.no_receipt")}
                      </span>
                    )}
                    {row.status !== "approved" && row.status !== "rejected" ? (
                      <>
                        <Button size="sm" disabled={busy} onClick={() => onReview(row.id, true)}>
                          {t("admin.virements.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => onReview(row.id, false)}
                        >
                          {t("admin.virements.reject")}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
