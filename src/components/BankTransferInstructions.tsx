import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCompanyBankAccount } from "@/lib/bank-transfers.functions";
import { Copy, Check, AlertCircle } from "lucide-react";

type Props = {
  reference: string;
  amountEuros: number;
  purposeLabel?: string;
};

export function BankTransferInstructions({ reference, amountEuros, purposeLabel }: Props) {
  const fetchAccount = useServerFn(getCompanyBankAccount);
  const [account, setAccount] = useState<{ holder: string; iban: string; bic: string; bank_name: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchAccount().then(setAccount).catch(() => setAccount(null));
  }, [fetchAccount]);

  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  if (!account) return <div className="text-sm text-muted-foreground">Chargement des coordonnées bancaires…</div>;

  const rows: { key: string; label: string; value: string; highlight?: boolean }[] = [
    { key: "amount", label: "Montant", value: `${amountEuros.toFixed(2)} €`, highlight: true },
    { key: "ref", label: "Référence (libellé obligatoire)", value: reference, highlight: true },
    { key: "holder", label: "Bénéficiaire", value: account.holder },
    { key: "iban", label: "IBAN", value: account.iban || "Non renseigné" },
    { key: "bic", label: "BIC", value: account.bic || "Non renseigné" },
    { key: "bank", label: "Banque", value: account.bank_name },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3 flex gap-2 text-xs text-amber-900 dark:text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Important :</strong> indiquez impérativement la référence <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{reference}</code> dans le libellé de votre virement. Sans elle, votre paiement {purposeLabel ?? "ne pourra pas être identifié"} et le crédit prendra plus de temps.
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-border last:border-0">
                <td className="px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground w-1/3">{r.label}</td>
                <td className={`px-4 py-3 font-mono ${r.highlight ? "font-bold text-primary" : ""}`}>{r.value}</td>
                <td className="px-2 py-3 w-12">
                  <button
                    onClick={() => copy(r.key, r.value)}
                    className="p-2 rounded hover:bg-secondary/50"
                    title="Copier"
                  >
                    {copied === r.key ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Délai d'arrivée : 1 à 2 jours ouvrés (virement SEPA standard). Dès réception, votre {purposeLabel ?? "compte"} est crédité automatiquement et vous recevez un email de confirmation.
      </p>
    </div>
  );
}
