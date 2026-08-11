import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  attachBankTransferReceipt,
  createBankTransferRequest,
  getBankDetails,
  listMyBankTransfers,
  type BankDetails,
} from "@/lib/bank-transfers.functions";
import { Button } from "@/components/ui/button";

type TransferRow = {
  id: string;
  reference: string;
  amount_cents: number;
  status: string;
  receipt_path: string | null;
  admin_notes: string | null;
  created_at: string;
  campaign_request_id: string | null;
};

const statusLabel: Record<string, string> = {
  pending: "En attente du virement",
  submitted: "Reçu envoyé — vérification MoveSpot",
  approved: "Validé et crédité",
  rejected: "Refusé",
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function BankTransferPanel({
  onCredited,
  campaignRequestId,
  title = "Recharger par virement bancaire",
  subtitle,
  fixedAmountEuros,
}: {
  onCredited?: () => void;
  /** Si fourni, le virement validé règle directement cette campagne. */
  campaignRequestId?: string;
  title?: string;
  subtitle?: string;
  fixedAmountEuros?: number;
}) {
  const fetchDetails = useServerFn(getBankDetails);
  const createRequest = useServerFn(createBankTransferRequest);
  const attachReceipt = useServerFn(attachBankTransferReceipt);
  const fetchList = useServerFn(listMyBankTransfers);

  const [details, setDetails] = useState<BankDetails | null>(null);
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [amount, setAmount] = useState(fixedAmountEuros ?? 500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const list = (await fetchList()) as TransferRow[];
    setRows(campaignRequestId ? list.filter((r) => r.campaign_request_id === campaignRequestId) : list);
  };

  useEffect(() => {
    fetchDetails().then(setDetails).catch(() => setDetails(null));
    reload().catch(() => setRows([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      await createRequest({ data: { amountEuros: amount, campaignRequestId } });
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const onUpload = async (requestId: string, file: File) => {
    setBusy(true);
    setError(null);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const userId = sess.user?.id;
      if (!userId) throw new Error("Session expirée");
      if (file.size > 10 * 1024 * 1024) throw new Error("Fichier trop lourd (10 Mo max)");

      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const path = `${userId}/${requestId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("bank-receipts")
        .upload(path, file, { upsert: true });
      if (upErr) throw new Error(upErr.message);

      await attachReceipt({ data: { requestId, receiptPath: path } });
      await reload();
      onCredited?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const copy = (value: string) => navigator.clipboard?.writeText(value);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Recharger par virement bancaire</h2>
        <p className="text-sm text-muted-foreground">
          Recommandé pour les gros budgets. Le solde est crédité après vérification du virement par notre équipe
          (généralement sous 1 à 2 jours ouvrés).
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[500, 1000, 2500, 5000].map((v) => (
          <button
            key={v}
            onClick={() => setAmount(v)}
            className={`rounded-lg border px-3 py-1.5 text-sm ${amount === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
          >
            {v} €
          </button>
        ))}
        <input
          type="number"
          min={10}
          value={amount}
          onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
          className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
        />
        <Button onClick={onCreate} disabled={busy || amount < 10} variant="secondary">
          Obtenir mes instructions de virement
        </Button>
      </div>

      {details?.iban ? (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-sm space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">RIB MoveSpot</div>
          <div className="flex items-center justify-between gap-3">
            <span>Titulaire</span>
            <strong>{details.accountHolder}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>IBAN</span>
            <span className="flex items-center gap-2">
              <strong className="font-mono">{details.iban}</strong>
              <button onClick={() => copy(details.iban)} className="text-xs text-primary underline">
                copier
              </button>
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>BIC</span>
            <strong className="font-mono">{details.bic}</strong>
          </div>
          <p className="text-xs text-muted-foreground">
            Indiquez impérativement la référence de votre demande ci-dessous dans le libellé du virement.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {rows.length > 0 ? (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.id} className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">
                    {fmt(row.amount_cents)} · réf. <span className="font-mono">{row.reference}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("fr-FR")} — {statusLabel[row.status] ?? row.status}
                  </div>
                </div>
                {row.status === "pending" || row.status === "submitted" ? (
                  <label className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                    {row.receipt_path ? "Remplacer le reçu" : "Téléverser mon reçu de virement"}
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      disabled={busy}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void onUpload(row.id, file);
                      }}
                    />
                  </label>
                ) : null}
              </div>
              {row.admin_notes ? <p className="text-xs text-muted-foreground">Note : {row.admin_notes}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
