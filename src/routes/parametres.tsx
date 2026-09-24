import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkDeletionBlockers, requestAccountDeletion } from "@/lib/account/account.functions";
import { toast } from "sonner";
import { RouteError } from "@/components/app/RouteError";
import { AlertTriangle, ChevronDown, ChevronUp, Loader2, ShieldCheck, Trash2 } from "lucide-react";

export const Route = createFileRoute("/parametres")({
  head: () => ({ meta: [{ title: "Paramètres du compte — MoveSpot" }] }),
  component: ParametresPage,
  errorComponent: ({ error }: { error: Error }) => <RouteError error={error} />,
});

type Blocker = { type: string; description: string; endDate: string };

function ParametresPage() {
  const navigate = useNavigate();
  const checkBlockers = useServerFn(checkDeletionBlockers);
  const deleteAccount = useServerFn(requestAccountDeletion);

  const [showDanger, setShowDanger] = useState(false);
  const [step, setStep] = useState<"idle" | "checking" | "blocked" | "confirm" | "deleting" | "done">("idle");
  const [blockers, setBlockers] = useState<Blocker[]>([]);
  const [reason, setReason] = useState("");
  const [confirmText, setConfirmText] = useState("");

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
      toast.error("Erreur lors de la vérification. Réessayez.");
      setStep("idle");
    }
  };

  const handleConfirmDeletion = async () => {
    if (confirmText !== "SUPPRIMER") return;
    setStep("deleting");
    try {
      const result = await deleteAccount({ data: { confirmText: "SUPPRIMER", reason: reason.trim() || undefined } });
      setStep("done");
      toast.success("Compte supprimé. Vous allez être déconnecté.");
      setTimeout(() => navigate({ to: "/" }), 3000);
      return result;
    } catch (err: any) {
      toast.error(err?.message ?? "Échec de la suppression. Réessayez.");
      setStep("confirm");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Paramètres du compte</h1>
          <p className="text-muted-foreground mt-1">Gérez vos préférences et vos droits RGPD.</p>
        </div>

        {/* ── Données personnelles ── */}
        <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Vos droits RGPD</h2>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-none">
            <li>✅ <strong>Droit d'accès</strong> — Contactez <a href="mailto:privacy@movespot.fr" className="text-primary underline">privacy@movespot.fr</a> pour obtenir une copie de vos données.</li>
            <li>✅ <strong>Droit de rectification</strong> — Modifiez vos informations depuis votre espace.</li>
            <li>✅ <strong>Droit à la portabilité</strong> — Vos données sur demande à <a href="mailto:privacy@movespot.fr" className="text-primary underline">privacy@movespot.fr</a>.</li>
            <li>✅ <strong>Droit à l'effacement</strong> — Supprimez votre compte ci-dessous.</li>
          </ul>
        </section>

        {/* ── Zone dangereuse ── */}
        <section className="rounded-2xl border-2 border-destructive/30 bg-destructive/5">
          <button
            onClick={() => setShowDanger((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">Supprimer mon compte</span>
            </div>
            {showDanger ? <ChevronUp className="w-4 h-4 text-destructive" /> : <ChevronDown className="w-4 h-4 text-destructive" />}
          </button>

          {showDanger && (
            <div className="px-6 pb-6 space-y-5 border-t border-destructive/20 pt-5">

              {/* Ce qui sera supprimé / conservé */}
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 space-y-2">
                  <p className="font-semibold text-destructive text-xs uppercase tracking-wider">Supprimé immédiatement</p>
                  <ul className="text-muted-foreground space-y-1 text-xs list-none">
                    <li>🗑 Nom, email, téléphone</li>
                    <li>🗑 Profil et photo</li>
                    <li>🗑 Historique de positions GPS</li>
                    <li>🗑 Photos de signalements</li>
                    <li>🗑 Accès au compte (déconnexion immédiate)</li>
                    <li>🗑 Compte définitivement fermé à J+30</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-2">
                  <p className="font-semibold text-amber-700 dark:text-amber-400 text-xs uppercase tracking-wider">Conservé (obligation légale)</p>
                  <ul className="text-muted-foreground space-y-1 text-xs list-none">
                    <li>📋 Transactions et paiements — <strong>10 ans</strong></li>
                    <li>📋 Historique des campagnes (anonymisé)</li>
                    <li>📋 Factures émises (anonymisées)</li>
                    <li className="text-[10px] text-muted-foreground/70 mt-2">
                      Exigé par le Code de commerce (art. L123-22) et l'administration fiscale.
                    </li>
                  </ul>
                </div>
              </div>

              {/* État : idle → bouton de démarrage */}
              {step === "idle" && (
                <button
                  onClick={handleStartDeletion}
                  className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/40 text-destructive px-4 py-2.5 text-sm font-semibold hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Continuer vers la suppression
                </button>
              )}

              {/* État : vérification en cours */}
              {step === "checking" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Vérification de votre compte…
                </div>
              )}

              {/* État : blocages détectés */}
              {step === "blocked" && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400 text-sm">Suppression temporairement bloquée</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Vous avez des engagements contractuels en cours :</p>
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {blockers.map((b, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex justify-between gap-4">
                        <span>{b.description}</span>
                        {b.endDate && <span className="text-xs font-medium whitespace-nowrap">jusqu'au {new Date(b.endDate).toLocaleDateString("fr-FR")}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground">Revenez une fois ces engagements terminés pour supprimer votre compte.</p>
                  <button onClick={() => setStep("idle")} className="text-xs text-primary underline">← Retour</button>
                </div>
              )}

              {/* État : confirmation */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-destructive">⚠️ Cette action est irréversible après 30 jours.</p>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">
                      Raison de la suppression <span className="normal-case">(optionnel)</span>
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Aidez-nous à améliorer MoveSpot…"
                      maxLength={500}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-destructive/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-widest text-muted-foreground">
                      Tapez <strong>SUPPRIMER</strong> pour confirmer
                    </label>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="SUPPRIMER"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-destructive/40"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStep("idle"); setConfirmText(""); setReason(""); }}
                      className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold hover:bg-secondary/50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleConfirmDeletion}
                      disabled={confirmText !== "SUPPRIMER"}
                      className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-2.5 text-sm font-semibold disabled:opacity-40 hover:bg-destructive/90 transition-colors"
                    >
                      Supprimer définitivement
                    </button>
                  </div>
                </div>
              )}

              {/* État : suppression en cours */}
              {step === "deleting" && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <Loader2 className="w-4 h-4 animate-spin" /> Suppression en cours… ne fermez pas cette page.
                </div>
              )}

              {/* État : terminé */}
              {step === "done" && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-sm text-green-700 dark:text-green-400">
                  ✅ Vos données personnelles ont été supprimées. Votre compte sera définitivement fermé dans 30 jours. Vous allez être redirigé…
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
