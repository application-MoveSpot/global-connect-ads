import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { createPayeeOnboardingLink, getPayeeConnectStatus } from "@/lib/payments/payee.functions";
import { Button } from "@/components/ui/button";

type Status = {
  connected: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
};

function StripeTrustBadge() {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5 text-xs text-muted-foreground">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
      >
        <path
          fillRule="evenodd"
          d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6A1.5 1.5 0 0 0 3 7.5v5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 6V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
          clipRule="evenodd"
        />
      </svg>
      <span dangerouslySetInnerHTML={{ __html: t("owner_connect.trust_badge") }} />
    </div>
  );
}

export function PayeeConnectCard() {
  const { t } = useTranslation();
  const fetchStatus = useServerFn(getPayeeConnectStatus);
  const createLink = useServerFn(createPayeeOnboardingLink);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus()
      .then((s: unknown) => setStatus(s as Status))
      .catch(() =>
        setStatus({
          connected: false,
          charges_enabled: false,
          payouts_enabled: false,
          details_submitted: false,
        }),
      );
  }, [fetchStatus]);

  const start = async () => {
    setLoading(true);
    setError(null);
    const newTab = window.open("", "_blank");
    try {
      const returnUrl =
        window.top !== window
          ? (window.top?.location.href ?? window.location.href)
          : window.location.href;
      const { url } = await createLink({ data: { returnUrl } });
      if (newTab) newTab.location.href = url;
      else window.location.href = url;
    } catch (e) {
      newTab?.close();
      setError(e instanceof Error ? e.message : t("owner_connect.err_generic"));
      setLoading(false);
    }
  };

  const active = status?.payouts_enabled && status?.details_submitted;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="font-display text-lg font-semibold">{t("owner_connect.title")}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("owner_connect.subtitle")}</p>
      </div>

      {status === null ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-3/4 rounded bg-secondary" />
          <div className="h-9 w-40 rounded-lg bg-secondary" />
        </div>
      ) : active ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                clipRule="evenodd"
              />
            </svg>
            {t("payee_connect.active_msg")}
          </div>
          <Button variant="outline" size="sm" onClick={start} disabled={loading}>
            {loading ? t("owner_connect.btn_loading") : t("owner_connect.btn_update")}
          </Button>
        </div>
      ) : status.connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-4 w-4 shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M6.701 2.25c.577-1 2.02-1 2.598 0l5.196 9a1.5 1.5 0 0 1-1.299 2.25H2.804a1.5 1.5 0 0 1-1.3-2.25l5.197-9ZM8 4a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                clipRule="evenodd"
              />
            </svg>
            {t("owner_connect.pending_msg")}
          </div>
          <Button onClick={start} disabled={loading}>
            {loading ? t("owner_connect.btn_loading") : t("owner_connect.btn_finalize")}
          </Button>
          <StripeTrustBadge />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("payee_connect.not_connected_desc")}</p>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold">
                1
              </span>
              {t("owner_connect.step1")}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold">
                2
              </span>
              {t("owner_connect.step2")}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] font-semibold">
                3
              </span>
              {t("payee_connect.step3")}
            </div>
          </div>
          <Button onClick={start} disabled={loading}>
            {loading ? t("owner_connect.btn_loading") : t("payee_connect.btn_connect")}
          </Button>
          <StripeTrustBadge />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
