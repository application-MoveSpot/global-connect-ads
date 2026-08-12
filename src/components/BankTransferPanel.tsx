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

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente du virement", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  submitted: { label: "Reçu en cours de vérification", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  approved: { label: "Validé et crédité", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  rejected: { label: "Refusé", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
};

function fmt(cents: number) {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 shrink-0">
      <path fillRule="evenodd" d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6A1.5 1.5 0 0 0 3 7.5v5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 6V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z" clipRule="evenodd" />
    </svg>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="rounded px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
    >
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

export function BankTransferPanel({
  onCredited,
  campaignRequestId,
  title = "Virement bancaire",
  subtitle,
  fixedAmountEuros,
}: {
  onCredited?: () => void;
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
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const [rows, setRows] = useState<TransferRow[]>([]);
  const [amount, setAmount] = useState(fixedAmountEuros ?? 500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    const list = (await fetchList()) as TransferRow[];
    setRows(campaignRequestId ? list.filter((r) => r.campaign_request_id === campaignRequestId) : list);
  };

  useEffect(() => {
    fetchDetails()
      .then((d) => { setDetails(d); setDetailsLoaded(true); })
      .catch(() => setDetailsLoaded(true));
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {subtitle ??
            "Recommandé pour les montants importants. Votre solde est crédité après vérification du virement par notre équipe (généralement sous 1 à 2 jours ouvrés)."}
        </p>
      </div>

      {/* Step 1 — Coordonnées bancaires */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">1</span>
          <span className="text-sm font-medium">Effectuez votre virement vers MoveSpot</span>
        </div>

        {!detailsLoaded ? (
          <div className="animate-pulse rounded-xl border border-border bg-secondary/30 p-4 space-y-2">
            <div className="h-3 w-32 rounded bg-secondary" />
            <div className="h-4 w-64 rounded bg-secondary" />
            <div className="h-4 w-24 rounded bg-secondary" />
          </div>
        ) : details?.iban ? (
          <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Coordonnées bancaires MoveSpot
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <LockIcon />
                Sécurisé
              </span>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Titulaire</span>
                <strong>{details.accountHolder}</strong>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">IBAN</span>
                <span className="flex items-center gap-1.5">
                  <strong className="font-mono text-xs tracking-wide">{details.iban}</strong>
                  <CopyButton value={details.iban} />
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">BIC / SWIFT</span>
                <span className="flex items-center gap-1.5">
                  <strong className="font-mono">{details.bic}</strong>
                  <CopyButton value={details.bic} />
                </span>
              </div>
            </div>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Mentionnez impérativement la référence de votre demande (étape 2) dans le libellé du virement pour un traitement rapide.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm">
            <p className="font-medium">Coordonnées bancaires disponibles sur demande</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enregistrez votre demande à l'étape 2 — nos coordonnées vous seront communiquées par e-mail dans les 24 h ouvrées.
            </p>
          </div>
        )}
      </div>

      {/* Step 2 — Enregistrer la demande */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">2</span>
          <span className="text-sm font-medium">Enregistrez votre virement et obtenez une référence</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {fixedAmountEuros == null
            ? [500, 1000, 2500, 5000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    amount === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  {v} €
                </button>
              ))
            : null}
          <input
            type="number"
            min={10}
            value={amount}
            readOnly={fixedAmountEuros != null}
            onChange={(e) => setAmount(Math.max(10, Number(e.target.value) || 0))}
            className="w-28 rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
          <Button onClick={onCreate} disabled={busy || amount < 10} variant="secondary">
            {busy ? "Création…" : "Générer ma référence de virement"}
          </Button>
        </div>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>

      {/* Step 3 — Mes demandes */}
      {rows.length > 0 ? (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">3</span>
            <span className="text-sm font-medium">Envoyez votre justificatif de virement</span>
          </div>
          <div className="space-y-3">
            {rows.map((row) => {
              const sc = statusConfig[row.status] ?? { label: row.status, className: "bg-secondary text-secondary-foreground" };
              return (
                <div key={row.id} className="rounded-xl border border-border bg-card p-4 text-sm space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {fmt(row.amount_cents)}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">réf. {row.reference}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleString("fr-FR")}
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sc.className}`}>
                      {sc.label}
                    </span>
                  </div>
                  {row.admin_notes ? (
                    <p className="rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                      Note MoveSpot : {row.admin_notes}
                    </p>
                  ) : null}
                  {row.status === "pending" || row.status === "submitted" ? (
                    <label className="flex cursor-pointer items-center gap-2 self-start rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                        <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                        <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
                      </svg>
                      {row.receipt_path ? "Remplacer le justificatif" : "Joindre mon justificatif"}
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
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
