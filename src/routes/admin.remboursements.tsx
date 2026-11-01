import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import {
  listRefundRequestsForAdmin,
  reviewRefundRequest,
  type AdminRefundRequest,
  type RefundModerationSummary,
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

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  processed: "bg-primary/10 text-primary border-primary/30",
};

const DECISION_CONFIG = {
  auto_approved: {
    label: "Auto-approuvé",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  auto_rejected: {
    label: "Auto-rejeté",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
  requires_human_review: {
    label: "Revue humaine requise",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    dot: "bg-amber-500",
  },
};

const RISK_CONFIG = {
  low: { label: "Faible", bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  medium: { label: "Moyen", bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  high: { label: "Élevé", bar: "bg-destructive", text: "text-destructive" },
};

function RefundAIPanel({ mod, onCopySuggestion }: { mod: RefundModerationSummary; onCopySuggestion: (note: string) => void }) {
  const [open, setOpen] = useState(true);
  const decision = DECISION_CONFIG[mod.decision];
  const risk = RISK_CONFIG[mod.risk_score];

  return (
    <div className="rounded-xl border border-violet-500/20 bg-violet-50/30 dark:bg-violet-950/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-violet-500/5 transition"
      >
        <div className="flex items-center gap-2">
          <span className="text-violet-500">✦</span>
          <span className="text-sm font-semibold text-violet-700 dark:text-violet-400">Analyse IA</span>
          {/* Decision badge */}
          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${decision.className}`}>
            <span className={`size-1.5 rounded-full ${decision.dot}`} />
            {decision.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Risk score mini */}
          <span className={`text-xs font-bold ${risk.text}`}>
            Risque {risk.label} ({mod.risk_score_numeric}/100)
          </span>
          <span className="text-muted-foreground text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-violet-500/15">
          {/* Risk score bar */}
          <div className="pt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Score de risque</span>
              <span className={`font-bold ${risk.text}`}>{mod.risk_score_numeric} / 100</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${risk.bar}`}
                style={{ width: `${mod.risk_score_numeric}%` }}
              />
            </div>
          </div>

          {/* Compliance */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-background/60 border border-border p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Conformité</p>
              <p className={`text-sm font-bold ${mod.compliance_eligible ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {mod.compliance_eligible ? "✓ Éligible" : "✗ Non éligible"}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">{mod.compliance_reason}</p>
            </div>
            <div className="rounded-lg bg-background/60 border border-border p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Décision IA</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{mod.decision_justification}</p>
            </div>
          </div>

          {/* Extracted facts */}
          {mod.extracted_facts.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Faits extraits</p>
              <ul className="space-y-1">
                {mod.extracted_facts.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <span className="text-violet-400 mt-0.5 shrink-0">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Policy violations */}
          {mod.policy_violations.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Violations de politique</p>
              <ul className="space-y-1">
                {mod.policy_violations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-destructive">
                    <span className="mt-0.5 shrink-0">⚠</span>
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk signals + tone flags */}
          {(mod.risk_signals.length > 0 || mod.tone_flags.length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {mod.risk_signals.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signaux de risque</p>
                  <div className="flex flex-wrap gap-1">
                    {mod.risk_signals.map((s, i) => (
                      <span key={i} className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded px-2 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {mod.tone_flags.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ton détecté</p>
                  <div className="flex flex-wrap gap-1">
                    {mod.tone_flags.map((f, i) => (
                      <span key={i} className="text-xs bg-secondary border border-border rounded px-2 py-0.5">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Suggested admin note */}
          {mod.suggested_admin_note && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
                  Note admin suggérée
                </p>
                <button
                  onClick={() => onCopySuggestion(mod.suggested_admin_note)}
                  className="text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
                >
                  Copier →
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed italic">"{mod.suggested_admin_note}"</p>
            </div>
          )}

          {/* Meta */}
          <p className="text-xs text-muted-foreground/60">
            Analysé le {new Date(mod.analyzed_at).toLocaleString("fr-FR")}
            {mod.processing_ms != null && ` · ${mod.processing_ms} ms`}
          </p>
        </div>
      )}
    </div>
  );
}

function AdminRemboursementsPage() {
  const { t, i18n } = useTranslation();
  const fetchRows = useServerFn(listRefundRequestsForAdmin);
  const review = useServerFn(reviewRefundRequest);

  const [rows, setRows] = useState<AdminRefundRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "processed">(
    "pending",
  );
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function fmt(cents: number | null) {
    if (cents == null) return "—";
    return (cents / 100).toLocaleString(i18n.language, { style: "currency", currency: "EUR" });
  }

  const reload = async (f = filter) => {
    setLoading(true);
    try {
      const res = await fetchRows({ data: { status: f === "all" ? undefined : f } });
      setRows(res.requests);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("admin.refunds.loading_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onAction = async (
    id: string,
    status: "approved" | "rejected" | "processed",
    suggestedNote?: string,
  ) => {
    let adminNotes: string | undefined;
    let stripeRefundId: string | undefined;

    if (status === "rejected") {
      const note = window.prompt(
        t("admin.refunds.reject_reason"),
        suggestedNote ?? "",
      );
      if (note === null) return;
      adminNotes = note || undefined;
    }
    if (status === "processed") {
      const refId = window.prompt(t("admin.refunds.stripe_refund_prompt"));
      if (refId === null) return;
      stripeRefundId = refId || undefined;
    }

    setBusy(true);
    try {
      const res = await review({ data: { id, status, adminNotes, stripeRefundId } });
      if (!res.ok) throw new Error((res as { error?: string }).error ?? "Erreur");
      toast.success(t("admin.refunds.updated"));
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const FILTERS = ["pending", "approved", "rejected", "processed", "all"] as const;
  const FILTER_LABEL_KEYS: Record<string, string> = {
    pending: "admin.refunds.filter_pending",
    approved: "admin.refunds.filter_approved",
    rejected: "admin.refunds.filter_rejected",
    processed: "admin.refunds.filter_processed",
    all: "admin.refunds.filter_all",
  };
  const STATUS_LABEL_KEYS: Record<string, string> = {
    pending: "admin.refunds.status_pending",
    approved: "admin.refunds.status_approved",
    rejected: "admin.refunds.status_rejected",
    processed: "admin.refunds.status_processed",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border light-band">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <LogoLink />
            <h1 className="font-display text-2xl font-bold mt-1">{t("admin.refunds.title")}</h1>
          </div>
          <a href="/admin" className="text-sm text-muted-foreground hover:text-foreground">
            {t("admin.refunds.back")}
          </a>
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
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80"
              }`}
            >
              {t(FILTER_LABEL_KEYS[f])}
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
            {t("admin.refunds.empty")}
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
                        {t("admin.refunds.campaign")}{" "}
                        <span className="font-mono">{r.campaign_request_id}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {t("admin.refunds.submitted_at", {
                        date: new Date(r.created_at).toLocaleDateString(i18n.language, {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        }),
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full border ${STATUS_COLOR[r.status] ?? ""}`}
                  >
                    {STATUS_LABEL_KEYS[r.status] ? t(STATUS_LABEL_KEYS[r.status]) : r.status}
                  </span>
                </div>

                {/* Motif */}
                <div className="rounded-lg bg-secondary/30 px-4 py-3 text-sm whitespace-pre-wrap">
                  {r.reason}
                </div>

                {/* Panneau IA */}
                {r.refund_claims_moderation ? (
                  <RefundAIPanel
                    mod={r.refund_claims_moderation}
                    onCopySuggestion={(note) => {
                      void navigator.clipboard.writeText(note).catch(() => {});
                      toast.success("Note copiée dans le presse-papiers");
                    }}
                  />
                ) : (
                  <div className="rounded-xl border border-violet-500/15 bg-violet-50/20 dark:bg-violet-950/10 px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-violet-400 animate-pulse">✦</span>
                    Analyse IA en cours…
                  </div>
                )}

                {/* Note admin existante */}
                {r.admin_notes && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                    <strong>{t("admin.refunds.admin_note")}</strong> {r.admin_notes}
                  </div>
                )}
                {r.stripe_refund_id && (
                  <p className="text-xs text-muted-foreground">
                    {t("admin.refunds.stripe_refund_id")}{" "}
                    <span className="font-mono">{r.stripe_refund_id}</span>
                  </p>
                )}

                {/* Actions */}
                {r.status === "pending" && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => onAction(r.id, "approved", r.refund_claims_moderation?.suggested_admin_note)}
                      disabled={busy}
                      className="rounded-lg bg-emerald-500/15 text-emerald-700 border border-emerald-500/40 px-4 py-2 text-sm font-semibold hover:bg-emerald-500/25 disabled:opacity-50 transition"
                    >
                      {t("admin.refunds.approve")}
                    </button>
                    <button
                      onClick={() => onAction(r.id, "rejected", r.refund_claims_moderation?.suggested_admin_note)}
                      disabled={busy}
                      className="rounded-lg bg-destructive/10 text-destructive border border-destructive/30 px-4 py-2 text-sm font-semibold hover:bg-destructive/20 disabled:opacity-50 transition"
                    >
                      {t("admin.refunds.reject")}
                    </button>
                  </div>
                )}
                {r.status === "approved" && (
                  <button
                    onClick={() => onAction(r.id, "processed")}
                    disabled={busy}
                    className="rounded-lg bg-primary/10 text-primary border border-primary/30 px-4 py-2 text-sm font-semibold hover:bg-primary/20 disabled:opacity-50 transition"
                  >
                    {t("admin.refunds.mark_processed")}
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
