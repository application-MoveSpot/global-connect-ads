import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listRefundRequestsForAdmin,
  reviewRefundRequest,
  type AdminRefundRequest,
} from "@/lib/payments/refund.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/remboursements")({
  head: () => ({
    meta: [
      { title: "Remboursements — Admin MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminRemboursementsPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
  processed: "Remboursée",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  processed: "bg-primary/10 text-primary border-primary/30",
};

function fmt(cents: number | null) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function AdminRemboursementsPage() {
  const fetchRows = useServerFn(listRefundRequestsForAdmin);
  const review = useServerFn(reviewRefundRequest);

  const [rows, setRows] = useState<AdminRefundRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "processed">("pending");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = async (f = filter) => {
    setLoading(true);
    try {
      const res = await fetchRows({ data: { status: f === "all" ? undefined : f } });
      setRows(res.requests);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAction = async (
    id: string,
    status: "approved" | "rejected" | "processed",
  ) => {
    let adminNotes: string | undefined;
    let stripeRefundId: string | undefined;

    if (status === "rejected") {
      const note = window.prompt("Motif du refus (visible par l'annonceur) :");
      if (note === null) return; // cancelled
      adminNotes = note || undefined;
    }
    if (status === "processed") {
      const refId = window.prompt("ID de remboursement Stripe (optionnel) :");
      if (refId === null) return;
      stripeRefundId = refId || undefined;
    }

    setBusy(true);
    try {
      const res = await review({ data: { id, status, adminNotes, stripeRefundId } });
      if (!res.ok) throw new Error((res as { error?: string }).error ?? "Erreur");
      toast.success("Demande mise à jour.");
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const FILTERS = ["pending", "approved", "rejected", "processed", "all"] as const;
  const FILTER_LABELS: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvées",
    rejected: "Refusées",
    processed: "Remboursées",
    all: "Toutes",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">Remboursements</h1>
          </div>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-4 w-1/3 bg-muted rounded mb-2" />
                <div className="h-3 w-1/2 bg-muted rounded mb-4" />
                <div className="h-16 bg-muted/50 rounded" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
            Aucune demande dans cette catégorie.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-border bg-card p-6 space-y-4">
                {/* En-tête */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-base">{fmt(r.amount_cents)}</p>
                    <p className="text-xs text-muted-foreground font-mono">{r.user_id}</p>
                    {r.campaign_request_id && (
                      <p className="text-xs text-muted-foreground">
                        Campagne : <span className="font-mono">{r.campaign_request_id}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Déposée le {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLOR[r.status] ?? ""}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>

                {/* Motif */}
                <div className="rounded-lg bg-secondary/30 px-4 py-3 text-sm whitespace-pre-wrap">
                  {r.reason}
                </div>

                {/* Note admin existante */}
                {r.admin_notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                    <strong>Note admin :</strong> {r.admin_notes}
                  </div>
                )}
                {r.stripe_refund_id && (
                  <p className="text-xs text-muted-foreground">Stripe refund ID : <span className="font-mono">{r.stripe_refund_id}</span></p>
                )}

                {/* Actions */}
                {r.status === "pending" && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => onAction(r.id, "approved")}
                      disabled={busy}
                      className="rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/40 px-4 py-2 text-sm font-semibold hover:bg-emerald-500/25 disabled:opacity-50 transition"
                    >
                      ✓ Approuver
                    </button>
                    <button
                      onClick={() => onAction(r.id, "rejected")}
                      disabled={busy}
                      className="rounded-lg bg-destructive/10 text-destructive border border-destructive/30 px-4 py-2 text-sm font-semibold hover:bg-destructive/20 disabled:opacity-50 transition"
                    >
                      ✕ Refuser
                    </button>
                  </div>
                )}
                {r.status === "approved" && (
                  <button
                    onClick={() => onAction(r.id, "processed")}
                    disabled={busy}
                    className="rounded-lg bg-primary/10 text-primary border border-primary/30 px-4 py-2 text-sm font-semibold hover:bg-primary/20 disabled:opacity-50 transition"
                  >
                    💸 Marquer comme remboursé
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
