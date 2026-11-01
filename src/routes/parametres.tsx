import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppHeader } from "@/components/app/AppHeader";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import {
  checkDeletionBlockers,
  requestAccountDeletion,
  exportUserData,
} from "@/lib/account/account.functions";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres du compte — MoveSpot" }] }),
  component: ParametresPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Blocker = { type: string; description: string; endDate: string };

function ParametresPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const checkBlockers = useServerFn(checkDeletionBlockers);
  const deleteAccount = useServerFn(requestAccountDeletion);
  const fetchExport = useServerFn(exportUserData);

  const [exportLoading, setExportLoading] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [step, setStep] = useState<
    "idle" | "checking" | "blocked" | "confirm" | "deleting" | "done"
  >("idle");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const CONFIRM_WORD = "SUPPRIMER";

  const handleStartDeletion = async () => {
    setStep("checking");
    try {
      const result = await checkBlockers({ data: {} });
      if (result.blocked) {
        setBlockers(result.blockers as Blocker[]);
        setStep("blocked");
      } else {
        setStep("confirm");
      }
    } catch {
      toast.error(t("parametres.error_check"));
      setStep("idle");
    }
  };

  const handleConfirmDeletion = async () => {
    if (confirmText !== CONFIRM_WORD) return;
    setStep("deleting");
    try {
      const result = await deleteAccount({
        data: { confirmText: "SUPPRIMER", reason: reason.trim() || undefined },
      });
      setStep("done");
      toast.success(t("parametres.success_delete"));
      setTimeout(() => navigate({ to: "/" }), 3000);
      return result;
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? t("parametres.error_delete"));
      setStep("confirm");
    }
  };

  const handleDataExport = async () => {
    setExportLoading(true);
    try {
      const payload = await fetchExport();
      const userId = payload.user_id;
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `movespot_rgpd_export_${userId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t("parametres.export_success"));
    } catch {
      toast.error(t("parametres.export_error"));
    } finally {
      setExportLoading(false);
    }
  };

  const dateLocale = i18n.language;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        right={
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("parametres.back")}
          </button>
        }
      />
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">{t("parametres.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("parametres.subtitle")}</p>
        </div>

        {/* ── Données personnelles ── */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">{t("parametres.rgpd_title")}</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-none">
            <li>
              ✅ <strong>{t("parametres.rgpd_access")}</strong> — {t("parametres.rgpd_access_desc")}
            </li>
            <li>
              ✅ <strong>{t("parametres.rgpd_portability")}</strong> —{" "}
              {t("parametres.rgpd_portability_desc")}
            </li>
            <li>
              ✅ <strong>{t("parametres.rgpd_erasure")}</strong> —{" "}
              {t("parametres.rgpd_erasure_desc")}
            </li>
          </ul>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleDataExport}
              disabled={exportLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-2.5 text-sm font-semibold hover:bg-secondary/70 transition-colors disabled:opacity-50"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {exportLoading
                ? t("parametres.export_loading")
                : t("parametres.export_btn")}
            </button>
            <p className="mt-1.5 text-[11px] text-muted-foreground/60">
              {t("parametres.export_hint")}
            </p>
          </div>
        </section>

        {/* ── Zone dangereuse ── */}
        <section className="rounded-2xl border-2 border-destructive/30 bg-destructive/5">
          <button
            onClick={() => setShowDanger((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {t("parametres.delete_account")}
              </span>
            </div>
            {showDanger ? (
              <ChevronUp className="w-4 h-4 text-destructive" />
            ) : (
              <ChevronDown className="w-4 h-4 text-destructive" />
            )}
          </button>

          {showDanger && (
            <div className="px-6 pb-6 space-y-5 border-t border-destructive/20 pt-5">
              <p className="text-sm text-muted-foreground">{t("parametres.delete_account_desc")}</p>

              {/* État : idle → bouton de démarrage */}
              {step === "idle" && (
                <button
                  onClick={handleStartDeletion}
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/40 text-destructive px-4 py-2.5 text-sm font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> {t("parametres.delete_account")}
                </button>
              )}

              {/* État : vérification en cours */}
              {step === "checking" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("parametres.checking")}
                </div>
              )}

              {/* État : blocages détectés */}
              {step === "blocked" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">
                        {t("parametres.blocked_title")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("parametres.blocked_desc")}
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {blockers.map((b, i) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex justify-between gap-4"
                      >
                        <span>{b.description}</span>
                        {b.endDate && (
                          <span className="text-xs font-medium whitespace-nowrap">
                            {t("parametres.blocked_until", {
                              date: new Date(b.endDate).toLocaleDateString(dateLocale),
                            })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">{t("parametres.blocked_return")}</p>
                  <button
                    onClick={() => setStep("idle")}
                    className="text-xs text-primary underline"
                  >
                    {t("parametres.back")}
                  </button>
                </div>
              )}

              {/* État : confirmation */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-destructive">
                    {t("parametres.irreversible")}
                  </p>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">
                      {t("parametres.reason_label")}{" "}
                      <span className="normal-case">({t("common.optional")})</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder={t("parametres.reason_placeholder")}
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">
                      {t("parametres.confirm_label")}
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder={t("parametres.confirm_placeholder")}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-destructive/40"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setStep("idle");
                        setConfirmText("");
                        setReason("");
                      }}
                      className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-secondary/50 transition-colors"
                    >
                      {t("parametres.cancel")}
                    </button>
                    <button
                      onClick={handleConfirmDeletion}
                      disabled={confirmText !== CONFIRM_WORD}
                      className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold disabled:opacity-40 hover:bg-destructive/90 transition-colors"
                    >
                      {t("parametres.delete_final")}
                    </button>
                  </div>
                </div>
              )}

              {/* État : suppression en cours */}
              {step === "deleting" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <Loader2 className="w-4 h-4 animate-spin" /> {t("parametres.deleting")}
                </div>
              )}

              {/* État : terminé */}
              {step === "done" && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-400">
                  {t("parametres.done")}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
