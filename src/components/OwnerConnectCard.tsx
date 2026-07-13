import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createConnectOnboardingLink, getConnectAccountStatus } from "@/lib/payments.functions";
import { Button } from "@/components/ui/button";

export function OwnerConnectCard() {
  const fetchStatus = useServerFn(getConnectAccountStatus);
  const createLink = useServerFn(createConnectOnboardingLink);
  const [status, setStatus] = useState<{ connected: boolean; charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus().then(setStatus).catch(() => setStatus({ connected: false, charges_enabled: false, payouts_enabled: false, details_submitted: false }));
  }, [fetchStatus]);

  const start = async () => {
    setLoading(true); setError(null);
    try {
      const { url } = await createLink({ data: { returnUrl: window.location.href } });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  };

  const active = status?.payouts_enabled && status?.details_submitted;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h3 className="font-display text-lg font-semibold">Paiements — Stripe Connect</h3>
      {active ? (
        <>
          <p className="text-sm text-emerald-500">✅ Votre compte Stripe est actif. Vous recevrez vos reversements automatiquement.</p>
          <Button variant="outline" size="sm" onClick={start} disabled={loading}>
            {loading ? "Chargement…" : "Mettre à jour mes informations"}
          </Button>
        </>
      ) : status?.connected ? (
        <>
          <p className="text-sm text-muted-foreground">
            Onboarding Stripe en cours. Terminez la vérification (pièce d'identité, IBAN) pour être payé automatiquement.
          </p>
          <Button onClick={start} disabled={loading}>
            {loading ? "Chargement…" : "Continuer l'onboarding Stripe"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Connectez votre compte bancaire via Stripe pour recevoir automatiquement 70 % de chaque campagne validée sur vos véhicules.
          </p>
          <Button onClick={start} disabled={loading}>
            {loading ? "Chargement…" : "Connecter mon compte via Stripe"}
          </Button>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
