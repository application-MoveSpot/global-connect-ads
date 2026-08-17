import { useCallback, useMemo, useState } from "react";
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

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  active:   { label: "Actif",      className: "bg-signal/20 text-signal" },
  trialing: { label: "Essai",      className: "bg-primary/15 text-primary" },
  past_due: { label: "En retard",  className: "bg-amber-500/20 text-amber-700 dark:text-amber-300" },
  canceled: { label: "Annulé",     className: "bg-secondary text-muted-foreground" },
  incomplete: { label: "Incomplet", className: "bg-secondary text-muted-foreground" },
};

function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  if (!status) return null;
  const s = STATUS_LABELS[status] ?? { label: status, className: "bg-secondary text-muted-foreground" };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

type Props = {
  subscriptionStatus: SubscriptionStatus;
  subscriptionPeriodEnd: string | null | undefined;
  onSuccess?: () => void;
};

export function PartnerSubscriptionCard({ subscriptionStatus, subscriptionPeriodEnd, onSuccess }: Props) {
  const createCheckout = useServerFn(createPartnerSubscriptionCheckout);
  const [open, setOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
      if (!result.clientSecret) throw new Error("Stripe n'a pas retourné de session.");
      return result.clientSecret;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erreur Stripe";
      setError(message);
      throw e;
    }
  }, [createCheckout]);

  const checkoutOptions = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  const handleOpen = async () => {
    setError(null);
    const config = await getPaymentsConfig();
    if (!config.publishableKey) {
      setError("Le paiement par carte n'est pas encore configuré.");
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
          <h2 className="font-display text-lg font-bold">Abonnement partenaire</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Accédez à l'espace partenaire et bénéficiez des avantages exclusifs MoveSpot.
          </p>
        </div>
        <SubscriptionBadge status={subscriptionStatus} />
      </div>

      {isActive ? (
        <div className="rounded-lg border border-signal/40 bg-signal/10 p-3 text-sm text-signal">
          ✓ Abonnement partenaire actif
          {subscriptionPeriodEnd && (
            <span className="text-muted-foreground ml-2">
              — renouvellement le {new Date(subscriptionPeriodEnd).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptionStatus && subscriptionStatus !== "canceled" && subscriptionStatus !== "incomplete" ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              Votre abonnement est <strong>{STATUS_LABELS[subscriptionStatus]?.label ?? subscriptionStatus}</strong>.
              Régularisez votre situation pour conserver l'accès partenaire.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
              Activez votre abonnement pour accéder aux fonctionnalités partenaires et être référencé sur la plateforme.
            </div>
          )}
          <button
            onClick={handleOpen}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            {subscriptionStatus === "past_due" ? "Régulariser mon abonnement" : "Devenir partenaire"}
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto p-0">
          <PaymentTestModeBanner />
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Abonnement partenaire MoveSpot</DialogTitle>
              <DialogDescription>
                Abonnement mensuel — sans engagement. Annulable à tout moment depuis votre espace.
              </DialogDescription>
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
