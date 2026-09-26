import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  submitRefundRequest,
  listMyRefundRequests,
  type RefundRequest,
} from "@/lib/payments/refund.functions";
import { LogoLink } from "@/components/app/LogoLink";
import { RouteError } from "@/components/app/RouteError";
import { toast } from "sonner";

export const Route = createFileRoute("/annonceur/remboursement")({
  head: () => ({
    meta: [
      { title: "Mes remboursements — MoveSpot" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: RemboursementAnnonceurPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type CampaignOption = { id: string; label: string };

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvée",
  rejected: "Refusée",
  processed: "Remboursée",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  processed: "bg-primary/10 text-primary border-primary/30",
};

function RemboursementAnnonceurPage() {
  const fetchRequests = useServerFn(listMyRefundRequests);
  const submit = useServerFn(submitRefundRequest);

  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignId, setCampaignId] = useState("");
  const [amountEuros, setAmountEuros] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const reload = async () => {
    try {
      const res = await fetchRequests({ data: {} });
      setRequests(res.requests);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return;

      const userId = sess.session.user.id;
      const { data: camps } = await supabase
        .from("campaign_requests")
        .select("id, spot_name, start_date, total_price")
        .eq("user_id", userId)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false })
        .limit(50);

      setCampaigns(
        (camps ?? []).map((c) => ({
          id: c.id,
          label: `${c.spot_name} — ${c.start_date ? new Date(c.start_date).toLocaleDateString("fr-FR") : "—"} · ${Number(c.total_price ?? 0).toFixed(2)} €`,
        })),
      );

      await reload();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (reason.trim().length < 20) {
      setFormError("Le motif doit contenir au moins 20 caractères.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit({
        data: {
          campaignRequestId: campaignId || undefined,
          amountCents: amountEuros ? Math.round(parseFloat(amountEuros) * 100) : undefined,
          reason: reason.trim(),
        },
      });
      if (!res.ok) {
        setFormError(res.error);
      } else {
        toast.success("Demande de remboursement envoyée.");
        setReason("");
        setAmountEuros("");
        setCampaignId("");
        await reload();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <LogoLink />
          <Link to="/annonceur" className="text-sm text-muted-foreground hover:text-foreground">← Mon espace</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Mes remboursements</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Consultez vos demandes ou déposez-en une nouvelle.{" "}
            <Link to="/remboursement" className="text-primary underline">Voir la politique de remboursement →</Link>
          </p>
        </div>

        {/* ── Nouvelle demande ── */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <h2 className="font-semibold text-lg">Nouvelle demande</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Campagne concernée <span className="normal-case">(optionnel)</span>
              </label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">— Sélectionner une campagne —</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Montant souhaité en € <span className="normal-case">(optionnel)</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                value={amountEuros}
                onChange={(e) => setAmountEuros(e.target.value)}
                placeholder="Ex. 150.00"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-widest text-muted-foreground">
                Motif détaillé <span className="normal-case">(obligatoire, 20 car. min.)</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Décrivez précisément la raison de votre demande : campagne non exécutée, erreur de montant, double débit…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground text-right">{reason.length}/1000</p>
            </div>

            {formError && (
              <p className="text-sm text-destructive rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2">{formError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? "Envoi…" : "Envoyer la demande"}
            </button>
          </form>
        </section>

        {/* ── Historique ── */}
        <section className="space-y-4">
          <h2 className="font-semibold text-lg">Historique de mes demandes</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
              Aucune demande pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {r.amount_cents
                          ? `${(r.amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
                          : "Montant à définir"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLOR[r.status] ?? ""}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.reason}</p>
                  {r.admin_notes && (
                    <div className="rounded-lg bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
                      <strong className="text-foreground">Note MoveSpot :</strong> {r.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
