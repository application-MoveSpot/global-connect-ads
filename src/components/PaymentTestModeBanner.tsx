const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/30 bg-destructive/15 px-4 py-2 text-center text-sm text-destructive">
        Le paiement live n'est pas configuré. Terminez le passage en live dans Payments avant d'accepter de vrais paiements.
      </div>
    );
  }

  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-warning/40 bg-warning/15 px-4 py-2 text-center text-sm text-warning">
        Les paiements de la preview sont en mode test.
      </div>
    );
  }

  return null;
}