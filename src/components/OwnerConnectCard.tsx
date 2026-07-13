// Placeholder pendant la migration vers Stripe Connect.
// Sera remplacé par le composant OwnerStripeConnectCard une fois la clé Stripe fournie.
export function OwnerConnectCard() {
  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6">
      <h3 className="font-display text-lg font-semibold mb-2">Paiements — migration en cours</h3>
      <p className="text-sm text-muted-foreground">
        Nous migrons vers Stripe Connect pour vous verser automatiquement votre part à chaque campagne.
        Vous serez invité à connecter votre compte bancaire dès que la migration sera terminée.
      </p>
    </div>
  );
}
