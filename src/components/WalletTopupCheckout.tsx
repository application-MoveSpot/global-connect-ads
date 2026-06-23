import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createWalletTopupTransfer } from "@/lib/bank-transfers.functions";
import { BankTransferInstructions } from "@/components/BankTransferInstructions";
import { Button } from "@/components/ui/button";

export function WalletTopupCheckout({ amountEuros, onCreated }: { amountEuros: number; onCreated?: () => void }) {
  const create = useServerFn(createWalletTopupTransfer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<{ reference: string; amount_cents: number } | null>(null);

  const start = async () => {
    setLoading(true); setError(null);
    try {
      const r = await create({ data: { amountEuros } });
      setTransfer({ reference: r.reference, amount_cents: r.amount_cents });
      onCreated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  if (transfer) {
    return (
      <BankTransferInstructions
        reference={transfer.reference}
        amountEuros={transfer.amount_cents / 100}
        purposeLabel="portefeuille"
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Vous allez générer une référence unique pour un virement de <strong>{amountEuros.toFixed(2)} €</strong> sur le compte MoveSpot.
      </p>
      <Button onClick={start} disabled={loading || amountEuros < 50}>
        {loading ? "Génération…" : "Générer mes instructions de virement"}
      </Button>
      {amountEuros < 50 && <p className="text-xs text-muted-foreground">Recharge minimum : 50 €.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
