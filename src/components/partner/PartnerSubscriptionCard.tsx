import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/hooks/useCurrency";
import { useServerFn } from "@tanstack/react-start";
import { createPartnerSubscriptionCheckout } from "@/lib/payments/payments.functions";

type SubscriptionStatus = string | null | undefined;

function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  const { t } = useTranslation();
  if (!status) return null;
  const STATUS_LABELS: Record<string, { label: string; className: string }> = {
    active: { label: t("subscription.status_active"), className: "bg-signal/20 text-signal" },
    trialing: { label: t("subscription.status_trialing"), className: "bg-primary/15 text-primary" },
    past_due: {
      label: t("subscription.status_past_due"),
      className: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    },
    canceled: {
      label: t("subscription.status_canceled"),
      className: "bg-secondary text-muted-foreground",
    },
    incomplete: {
      label: t("subscription.status_incomplete"),
      className: "bg-secondary text-muted-foreground",
    },
  };
  const s = STATUS_LABELS[status] ?? {
    label: status,
    className: "bg-secondary text-muted-foreground",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}

type Props = {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPeriodEnd: string | null | undefined;
  onSuccess?: () => void;
};

export function PartnerSubscriptionCard({
  subscriptionStatus,
  subscriptionPeriodEnd,
  onSuccess: _onSuccess,
}: Props) {
  const { t, i18n } = useTranslation();
  const { fmtAmount } = useCurrency();
  const createCheckout = useServerFn(createPartnerSubscriptionCheckout);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const STATUS_LABELS: Record<string, string> = {
    active: t("subscription.status_active"),
    trialing: t("subscription.status_trialing"),
    past_due: t("subscription.status_past_due"),
    canceled: t("subscription.status_canceled"),
    incomplete: t("subscription.status_incomplete"),
  };

  const isActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const handleSubscribe = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await createCheckout({
        data: {
          priceId: "partner_monthly",
          returnUrl: `${window.location.origin}/partner`,
        },
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      if (!result.url) {
        setError(t("subscription.err_not_configured"));
        return;
      }
      window.location.href = result.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("subscription.err_stripe"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <h2 className="font-display text-lg font-bold">{t("partner_sub.title")}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{t("partner_sub.subtitle")}</p>
        </div>
        <SubscriptionBadge status={subscriptionStatus} />
      </div>

      {isActive ? (
        <div className="rounded-lg border border-signal/40 bg-signal/10 p-3 text-sm text-signal">
          {t("partner_sub.active_label")}
          {subscriptionPeriodEnd && (
            <span className="text-muted-foreground ml-2">
              {t("subscription.renewal", {
                date: new Date(subscriptionPeriodEnd).toLocaleDateString(i18n.language),
              })}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold">{fmtAmount(149)}</span>
            <span className="text-sm text-muted-foreground">{t("subscription.price_suffix")}</span>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>{t("partner_sub.feature1")}</li>
            <li>{t("partner_sub.feature2")}</li>
            <li>{t("partner_sub.feature3")}</li>
            <li>{t("partner_sub.feature4")}</li>
            <li>{t("subscription.feature_cancel")}</li>
          </ul>
          {subscriptionStatus &&
          subscriptionStatus !== "canceled" &&
          subscriptionStatus !== "incomplete" ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {t("subscription.past_due_msg", {
                status: STATUS_LABELS[subscriptionStatus] ?? subscriptionStatus,
              })}{" "}
              {t("partner_sub.past_due_action")}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
              {t("partner_sub.inactive_msg")}
            </div>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading
              ? "..."
              : subscriptionStatus === "past_due"
                ? t("subscription.btn_regularize")
                : t("partner_sub.btn_subscribe")}
          </button>
        </div>
      )}
    </section>
  );
}
