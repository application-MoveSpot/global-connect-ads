import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createPayeeOnboardingLink, getPayeeConnectStatus } from "@/lib/payee.functions";
import { Button } from "@/components/ui/button";

type Status = { connected: boolean; charges_enabled: boolean; payouts_enabled: boolean; details_submitted: boolean };

export function PayeeConnectCard() {
  const fetchStatus = useServerFn(getPayeeConnectStatus);
  const createLink = useServerFn(createPayeeOnboardingLink);
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus()
      .then((s) => setStatus(s as Status))
      .catch(() => setStatus({ connected: false, charges_enabled: false, payouts_enabled: false, details_submitted: false }));
  }, [fetchStatus]);

  const start = async () => {
    setLoading(true);
    setError(null);
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
      <h3 className="font-display text-lg font-semibold">Mes reversements — Stripe Connect</h3>
      {active ? (
        <>
          <p className="text-sm text-emerald-500">
            ✅ Votre compte est actif. Vos prestations vous seront reversées automatiquement sur votre IBAN.
          </p>
          <Button variant="outline" size="sm" onClick={start} disabled={loading}>
            {loading ? "Chargement…" : "Mettre à jour mes informations bancaires"}
          </Button>
        </>
      ) : status?.connected ? (
        <>
          <p className="text-sm text-muted-foreground">
            Vérification en cours. Terminez l'onboarding Stripe (pièce d'identité + IBAN) pour recevoir vos paiements.
          </p>
          <Button onClick={start} disabled={loading}>
            {loading ? "Chargement…" : "Continuer l'onboarding Stripe"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Liez votre IBAN via Stripe pour recevoir automatiquement vos reversements (courses suivies, poses de
            covering). MoveSpot ne stocke jamais vos coordonnées bancaires : elles restent chez Stripe.
          </p>
          <Button onClick={start} disabled={loading}>
            {loading ? "Chargement…" : "Configurer mes virements bancaires"}
          </Button>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
