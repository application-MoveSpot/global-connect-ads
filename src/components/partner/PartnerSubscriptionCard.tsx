import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "@/hooks/useCurrency";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { createPartnerSubscriptionCheckout } from "@/lib/payments/payments.functions";
import { getPaymentsConfig, getStripe } from "@/lib/payments/stripe";
import { PaymentTestModeBanner } from "@/components/app/PaymentTestModeBanner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  onSuccess,
}: Props) {
  const { t, i18n } = useTranslation();
  const { fmtAmount } = useCurrency();
  const createCheckout = useServerFn(createPartnerSubscriptionCheckout);
  const [open, setOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = {
    active: t("subscription.status_active"),
    trialing: t("subscription.status_trialing"),
    past_due: t("subscription.status_past_due"),
    canceled: t("subscription.status_canceled"),
    incomplete: t("subscription.status_incomplete"),
  };

  const isActive = subscriptionStatus === "active" || subscriptionStatus === "trialing";

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    try {
      const result = await createCheckout({
        data: {
          priceId: "partner_monthly",
          returnUrl: `${window.location.origin}/partenaire`,
        },
      });
      if ("error" in result) throw new Error(result.error);
      if (!result.clientSecret) throw new Error(t("subscription.err_no_session"));
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : t("subscription.err_stripe");
      setError(message);
      throw e;
    }
  }, [createCheckout, t]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const handleOpen = async () => {
    setError(null);
    const config = await getPaymentsConfig();
    if (!config.publishableKey) {
      setError(t("subscription.err_not_configured"));
      setOpen(true);
      return;
    }
    setCheckoutKey((k) => k + 1);
    setOpen(true);
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v && onSuccess) onSuccess();
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
          <button
            onClick={handleOpen}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {subscriptionStatus === "past_due"
              ? t("subscription.btn_regularize")
              : t("partner_sub.btn_subscribe")}
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>{t("partner_sub.dialog_title")}</DialogTitle>
              <DialogDescription>{t("subscription.dialog_desc")}</DialogDescription>
            </DialogHeader>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {!error ? (
              <div key={checkoutKey} className="min-h-[560px]">
                <EmbeddedCheckoutProvider stripe={getStripe()} options={checkoutOptions}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
