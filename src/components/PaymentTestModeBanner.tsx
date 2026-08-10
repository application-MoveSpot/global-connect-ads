import { usePaymentsConfig } from "@/hooks/usePaymentsConfig";

export function PaymentTestModeBanner() {
  const config = usePaymentsConfig();

  if (!config) return null;

  if (!config.publishableKey) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-center text-sm text-destructive">
        Le paiement par carte n'est pas encore configuré. Ajoutez vos clés Stripe pour accepter les paiements.
      </div>
    );
  }

  if (config.environment === "sandbox") {
    return (
      <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-warning">
        Les paiements sont actuellement en mode test.
      </div>
    );
  }

  return null;
}
