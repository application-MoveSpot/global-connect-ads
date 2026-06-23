import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LogoLink } from "@/components/LogoLink";
import { listPendingTransfersAdmin, confirmTransferAdmin } from "@/lib/bank-transfers.functions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/virements")({
  component: AdminTransfersPage,
});

type Transfer = {
  id: string;
  reference: string;
  amount_cents: number;
  amount_euros: number;
  status: string;
  purpose: string;
  campaign_request_id: string | null;
  user_id: string;
  user_email: string;
  user_name: string;
  created_at: string;
  expires_at: string;
  received_at: string | null;
};

function fmt(cents: number) { return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function AdminTransfersPage() {
  const navigate = useNavigate();
  const fetchList = useServerFn(listPendingTransfersAdmin);
  const confirm = useServerFn(confirmTransferAdmin);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const r = await fetchList();
      setTransfers(r.transfers as Transfer[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/auth" }); return; }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onConfirm = async (id: string) => {
    if (!window.confirm("Confirmer que le virement a bien été reçu sur le compte CA ?")) return;
    setBusyId(id);
    try {
      await confirm({ data: { id } });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally { setBusyId(null); }
  };

  const filtered = filter === "pending" ? transfers.filter((t) => t.status === "pending") : transfers;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <div className="flex gap-3 text-sm">
            <Link to="/admin" className="text-muted-foreground hover:text-foreground">Admin</Link>
            <Link to="/admin/reversements" className="text-muted-foreground hover:text-foreground">Reversements</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Virements bancaires entrants</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connecte-toi à ton portail Crédit Agricole, identifie les virements reçus, et confirme leur réception ici pour créditer automatiquement le portefeuille du client.
          </p>
        </div>

        {error && <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">{error}</div>}

        <div className="flex gap-2">
          <button onClick={() => setFilter("pending")} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === "pending" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            En attente ({transfers.filter((t) => t.status === "pending").length})
          </button>
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
            Tous ({transfers.length})
          </button>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">Aucun virement.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Référence</th>
                  <th className="text-left px-4 py-3">Client</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-right px-4 py-3">Montant</th>
                  <th className="text-left px-4 py-3">Créé</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const age = daysSince(t.created_at);
                  return (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-3 font-mono font-semibold">{t.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.user_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{t.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">{t.purpose === "wallet_topup" ? "Recharge portefeuille" : "Paiement campagne"}</td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(t.amount_cents)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("fr-FR")}
                        {t.status === "pending" && <div className={age > 3 ? "text-amber-600" : ""}>il y a {age}j</div>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {t.status === "pending" && (
                          <Button size="sm" onClick={() => onConfirm(t.id)} disabled={busyId === t.id}>
                            {busyId === t.id ? "…" : "Confirmer reçu"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-700" },
    received: { label: "Reçu", cls: "bg-emerald-500/15 text-emerald-700" },
    expired: { label: "Expiré", cls: "bg-muted text-muted-foreground" },
    cancelled: { label: "Annulé", cls: "bg-destructive/15 text-destructive" },
  };
  const x = map[status] ?? { label: status, cls: "bg-secondary" };
  return <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${x.cls}`}>{x.label}</span>;
}
