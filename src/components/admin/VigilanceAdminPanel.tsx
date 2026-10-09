/**
 * Panneau admin — Gestion des attestations de vigilance Urssaf
 * Analyse IA automatique : détection fraude, document flouté, expiré.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListVigilancePending,
  adminGetAttestationUrl,
  adminAnalyseAttestation,
  reviewVigilance,
  VIGILANCE_SEUIL_CENTIMES,
  type VigilancePendingRow,
  type AttestationAnalyse,
} from "@/lib/payments/vigilance.functions";

// ─── Icônes ──────────────────────────────────────────────────────────────────

function IconCheck({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function IconX({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
    </svg>
  );
}

function IconScan({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4 2a2 2 0 0 0-2 2v4a.75.75 0 0 0 1.5 0V4a.5.5 0 0 1 .5-.5h4a.75.75 0 0 0 0-1.5H4ZM13.25 2.75a.75.75 0 0 1 .75-.75h2a2 2 0 0 1 2 2v4a.75.75 0 0 1-1.5 0V4a.5.5 0 0 0-.5-.5h-2a.75.75 0 0 1-.75-.75ZM3.75 13.25a.75.75 0 0 0-1.5 0v2A2 2 0 0 0 4 17.5h4a.75.75 0 0 0 0-1.5H4a.5.5 0 0 1-.5-.5v-2ZM14 17.5a.75.75 0 0 1-.75-.75.75.75 0 0 1 .75-.75h2a.5.5 0 0 0 .5-.5v-2a.75.75 0 0 1 1.5 0v2A2 2 0 0 1 16 17.5h-2ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
    </svg>
  );
}

function IconExternalLink({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
      <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
    </svg>
  );
}

// ─── Badge verdict IA ─────────────────────────────────────────────────────────

function VerdictBadge({ analyse }: { analyse: AttestationAnalyse }) {
  const { t } = useTranslation();
  if (analyse.auto_rejete) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
        <IconX className="h-3 w-3" /> {t("vigil_admin.verdict_rejected_auto")}
      </span>
    );
  }
  if (analyse.verdict === "authentique" && analyse.score_fraude < 30) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
        <IconCheck className="h-3 w-3" /> {t("vigil_admin.verdict_authentic")}
      </span>
    );
  }
  if (analyse.verdict === "suspect" || (analyse.score_fraude >= 50 && analyse.score_fraude < 85)) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
        ⚠️ {t("vigil_admin.verdict_suspect", { score: analyse.score_fraude })}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
      🔴 {t("vigil_admin.verdict_fraud", { score: analyse.score_fraude })}
    </span>
  );
}

// ─── Carte attestation ────────────────────────────────────────────────────────

function AttestationCard({
  row,
  onRefresh,
}: {
  row: VigilancePendingRow;
  onRefresh: () => void;
}) {
  const getUrl = useServerFn(adminGetAttestationUrl);
  const analyse = useServerFn(adminAnalyseAttestation);
  const review = useServerFn(reviewVigilance);

  const { t, i18n } = useTranslation();
  const [analysisResult, setAnalysisResult] = useState<AttestationAnalyse | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const gainsEuros = (row.gains_centimes / 100).toLocaleString(i18n.language, {
    style: "currency",
    currency: "EUR",
  });
  const pct = Math.min(100, (row.gains_centimes / VIGILANCE_SEUIL_CENTIMES) * 100);

  const handleViewAttestation = async () => {
    if (!row.attestation_url) return;
    try {
      const { url } = await getUrl({ data: { storagePath: row.attestation_url } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("vigil_admin.err_generic"));
    }
  };

  const handleAnalyse = async () => {
    setAnalysing(true);
    try {
      const result = await analyse({ data: { ownerProfileId: row.id } });
      setAnalysisResult(result);
      if (result.auto_rejete) {
        toast.error(t("vigil_admin.auto_rejected_notify"));
        onRefresh();
      } else {
        toast.success(t("vigil_admin.analysis_done"));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("vigil_admin.err_analysis"));
    } finally {
      setAnalysing(false);
    }
  };

  const validateMut = useMutation({
    mutationFn: () =>
      review({ data: { ownerUserId: row.user_id, decision: "VALIDE" } }),
    onSuccess: () => {
      toast.success(t("vigil_admin.validated_ok"));
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectMut = useMutation({
    mutationFn: () =>
      review({
        data: {
          ownerUserId: row.user_id,
          decision: "BLOQUE",
          notes: rejectNotes || t("vigil_admin.default_reject_reason"),
        },
      }),
    onSuccess: () => {
      toast.success(t("vigil_admin.rejected_ok"));
      setRejectOpen(false);
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const statutColors: Record<string, string> = {
    BLOQUE: "text-destructive bg-destructive/10 border-destructive/30",
    VALIDE: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/30",
    EN_ATTENTE: "text-amber-700 bg-amber-50 dark:bg-amber-950/20 border-amber-500/30",
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">
            {row.full_name ?? t("vigil_admin.no_name")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("vigil_admin.profile_id_label", { id: row.id.slice(0, 8) })}
            {row.seuil_atteint_at && (
              <>{t("vigil_admin.threshold_date", { date: new Date(row.seuil_atteint_at).toLocaleDateString(i18n.language) })}</>
            )}
          </p>
        </div>
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statutColors[row.statut]}`}>
          {row.statut}
        </span>
      </div>

      {/* Barre de progression gains */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium">
          <span>{t("vigil_admin.gains_label")} <strong>{gainsEuros}</strong></span>
          <span className="text-muted-foreground">{t("vigil_admin.threshold_pct", { pct: pct.toFixed(0) })}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-destructive"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Notes existantes */}
      {row.notes && (
        <p className="rounded-lg bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          📝 {row.notes}
        </p>
      )}

      {/* Résultat analyse IA */}
      {analysisResult && (
        <div className={`rounded-xl border p-3 space-y-2 ${
          analysisResult.auto_rejete
            ? "border-destructive/30 bg-destructive/5"
            : analysisResult.verdict === "authentique"
              ? "border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/10"
              : "border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/10"
        }`}>
          <div className="flex flex-wrap items-center gap-2">
            <VerdictBadge analyse={analysisResult} />
            {analysisResult.siret && (
              <span className="text-xs text-muted-foreground">{t("vigil_admin.siret_label", { siret: analysisResult.siret })}</span>
            )}
            {analysisResult.date_validite && (
              <span className="text-xs text-muted-foreground">
                {t("vigil_admin.validity_label", { date: analysisResult.date_validite })}
                {analysisResult.expire && <span className="text-destructive ml-1">{t("vigil_admin.expired")}</span>}
              </span>
            )}
          </div>
          {!analysisResult.lisible && (
            <p className="text-xs text-destructive font-medium">{t("vigil_admin.unreadable")}</p>
          )}
          {analysisResult.motifs.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
              {analysisResult.motifs.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          )}
          {analysisResult.auto_rejete && (
            <p className="text-xs font-medium text-destructive">
              {t("vigil_admin.auto_rejected_msg")}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {row.attestation_url && (
          <button
            type="button"
            onClick={handleViewAttestation}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary transition"
          >
            <IconExternalLink className="h-3.5 w-3.5" />
            {t("vigil_admin.btn_view")}
          </button>
        )}

        <button
          type="button"
          onClick={handleAnalyse}
          disabled={analysing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <IconScan className="h-3.5 w-3.5" />
          {analysing ? t("vigil_admin.btn_analysing") : t("vigil_admin.btn_analyse")}
        </button>

        {row.statut !== "VALIDE" && !analysisResult?.auto_rejete && (
          <>
            <button
              type="button"
              onClick={() => validateMut.mutate()}
              disabled={validateMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
            >
              <IconCheck className="h-3.5 w-3.5" />
              {validateMut.isPending ? t("vigil_admin.btn_validating") : t("vigil_admin.btn_validate")}
            </button>

            {!rejectOpen ? (
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
              >
                <IconX className="h-3.5 w-3.5" />
                {t("vigil_admin.btn_reject")}
              </button>
            ) : (
              <div className="w-full space-y-2">
                <textarea
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  placeholder={t("vigil_admin.reject_placeholder")}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => rejectMut.mutate()}
                    disabled={rejectMut.isPending}
                    className="rounded-lg bg-destructive px-3 py-1.5 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90 transition disabled:opacity-60"
                  >
                    {rejectMut.isPending ? t("vigil_admin.btn_confirming") : t("vigil_admin.btn_confirm_reject")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectOpen(false)}
                    className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary transition"
                  >
                    {t("vigil_admin.btn_cancel")}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Panneau principal ────────────────────────────────────────────────────────

export function VigilanceAdminPanel() {
  const { t } = useTranslation();
  const listFn = useServerFn(adminListVigilancePending);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-vigilance"],
    queryFn: () => listFn(),
    retry: false,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-vigilance"] });

  const rows: VigilancePendingRow[] = (query.data ?? []) as VigilancePendingRow[];
  const pending = rows.filter((r: VigilancePendingRow) => r.statut === "BLOQUE" && r.attestation_url);
  const valide = rows.filter((r: VigilancePendingRow) => r.statut === "VALIDE");

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-2xl bg-secondary/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {(query.error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compteurs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{pending.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("vigil_admin.count_pending")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{valide.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("vigil_admin.count_validated")}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{rows.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("vigil_admin.count_total")}</p>
        </div>
      </div>

      {/* Note IA */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{t("vigil_admin.ai_note_title")}</span> {t("vigil_admin.ai_note_desc")}
      </div>

      {/* Liste en attente */}
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
          {t("vigil_admin.empty")}
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground">
            {t("vigil_admin.section_pending", { count: pending.length })}
          </h3>
          {pending.map((row: VigilancePendingRow) => (
            <AttestationCard key={row.id} row={row} onRefresh={refresh} />
          ))}
        </div>
      )}

      {/* Déjà validées */}
      {valide.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-foreground text-sm text-muted-foreground">
            {t("vigil_admin.section_validated", { count: valide.length })}
          </h3>
          {valide.map((row: VigilancePendingRow) => (
            <AttestationCard key={row.id} row={row} onRefresh={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}
