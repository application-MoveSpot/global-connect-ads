import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMyWallet, payCampaignWithWallet } from "@/lib/wallet.functions";
import { Button } from "@/components/ui/button";
import { WalletTopupCheckout } from "@/components/WalletTopupCheckout";

type Props = {
  campaignRequestId: string;
  totalPriceEur: number;
  onPaid?: () => void;
};

export function CampaignPaymentCheckout({ campaignRequestId, totalPriceEur, onPaid }: Props) {
  const fetchWallet = useServerFn(getMyWallet);
  const payWithWallet = useServerFn(payCampaignWithWallet);

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet().then((w) => setBalance(w.balance_cents)).catch(() => setBalance(0));
  }, [fetchWallet]);

  const neededCents = Math.round(totalPriceEur * 100);
  const enough = balance !== null && balance >= neededCents;
  const missingEur = enough ? 0 : Math.max(10, Math.ceil((neededCents - (balance ?? 0)) / 100));

  const onPayWallet = async () => {
    setLoading(true); setError(null);
    try {
      await payWithWallet({ data: { campaignRequestId } });
      onPaid?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm">
        Solde portefeuille : <strong>{((balance ?? 0) / 100).toFixed(2)} €</strong> · Montant dû : <strong>{totalPriceEur.toFixed(2)} €</strong>
      </div>

      {enough ? (
        <Button onClick={onPayWallet} disabled={loading}>
          {loading ? "Paiement…" : `Payer ${totalPriceEur.toFixed(2)} € avec mon portefeuille`}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Solde insuffisant. Rechargez par carte pour compléter le paiement.</p>
          <WalletTopupCheckout
            amountEuros={missingEur}
            disabled={loading}
            buttonLabel={`Recharger ${missingEur} € par carte`}
          />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
