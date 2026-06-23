import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { getMyWallet } from "@/lib/wallet.functions";
import { payCampaignWithWallet } from "@/lib/wallet.functions";
import { createCampaignTransfer } from "@/lib/bank-transfers.functions";
import { BankTransferInstructions } from "@/components/BankTransferInstructions";
import { Button } from "@/components/ui/button";

type Props = {
  campaignRequestId: string;
  totalPriceEur: number;
  onPaid?: () => void;
};

export function CampaignPaymentCheckout({ campaignRequestId, totalPriceEur, onPaid }: Props) {
  const fetchWallet = useServerFn(getMyWallet);
  const payWithWallet = useServerFn(payCampaignWithWallet);
  const createTransfer = useServerFn(createCampaignTransfer);

  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"choose" | "transfer">("choose");
  const [transfer, setTransfer] = useState<{ reference: string; amount_cents: number } | null>(null);

  useEffect(() => {
    fetchWallet().then((w) => setBalance(w.balance_cents)).catch(() => setBalance(0));
  }, [fetchWallet]);

  const neededCents = Math.round(totalPriceEur * 100);
  const enough = balance !== null && balance >= neededCents;

  const onPayWallet = async () => {
    setLoading(true); setError(null);
    try {
      await payWithWallet({ data: { campaignRequestId } });
      onPaid?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  const onCreateTransfer = async () => {
    setLoading(true); setError(null);
    try {
      const r = await createTransfer({ data: { campaignRequestId } });
      setTransfer({ reference: r.reference, amount_cents: r.amount_cents });
      setMode("transfer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  if (mode === "transfer" && transfer) {
    return (
      <div className="space-y-3">
        <BankTransferInstructions
          reference={transfer.reference}
          amountEuros={transfer.amount_cents / 100}
          purposeLabel="campagne"
        />
        <button onClick={() => setMode("choose")} className="text-xs text-muted-foreground hover:text-foreground">← Choisir un autre mode</button>
      </div>
    );
  }

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
          <p className="text-sm text-muted-foreground">
            Solde insuffisant. Vous pouvez soit recharger votre portefeuille (plus rapide pour les paiements futurs), soit régler cette campagne par un virement direct.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/annonceur/portefeuille" search={{ topup: "1" }} className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
              Recharger mon portefeuille
            </Link>
            <Button variant="outline" onClick={onCreateTransfer} disabled={loading}>
              {loading ? "…" : "Payer cette campagne par virement"}
            </Button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
