import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createOwnerConnectOnboarding, refreshOwnerConnectStatus } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";

type Props = {
  initiallyPayoutsEnabled?: boolean;
};

export function OwnerConnectCard({ initiallyPayoutsEnabled }: Props) {
  const onboard = useServerFn(createOwnerConnectOnboarding);
  const refresh = useServerFn(refreshOwnerConnectStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(!!initiallyPayoutsEnabled);

  useEffect(() => {
    let env: "sandbox" | "live";
    try { env = getStripeEnvironment(); } catch { return; }
    refresh({ data: { environment: env } })
      .then((r) => setPayoutsEnabled(!!r.payouts_enabled))
      .catch(() => {});
  }, [refresh]);

  const start = async () => {
    setLoading(true); setError(null);
    try {
      const env = getStripeEnvironment();
      const url = `${window.location.origin}/proprietaire`;
      const res = await onboard({ data: {
        environment: env,
        returnUrl: `${url}?stripe=done`,
        refreshUrl: `${url}?stripe=refresh`,
      }});
      if ("error" in res) throw new Error(res.error);
      window.location.href = res.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setLoading(false);
    }
  };

  if (payoutsEnabled) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" /> Paiements activés
        </CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Votre compte Stripe est connecté. Vous recevrez 70 % du montant de chaque campagne (MoveSpot conserve 30 %) à la fin de la diffusion.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600" /> Activer mes paiements
      </CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pour recevoir vos revenus de campagne (70 % du prix par jour de diffusion, MoveSpot conserve 30 %), connectez votre compte Stripe. Onboarding sécurisé, KYC géré par Stript — environ 3 minutes.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={start} disabled={loading}>
          {loading ? "Redirection…" : "Activer les paiements Stripe"}
        </Button>
      </CardContent>
    </Card>
  );
}
