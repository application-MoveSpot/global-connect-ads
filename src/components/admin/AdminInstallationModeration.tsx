/**
 * AdminInstallationModeration
 *
 * Dashboard de modération des poses pour les administrateurs MoveSpot.
 * Affiche les missions en attente de validation (status = 'pending_validation')
 * avec la grille 4 photos et les boutons Approuver / Rejeter.
 */

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  ZoomIn,
  Loader2,
  Camera,
  User,
  Calendar,
  X,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  useAdminPendingInstallations,
  useApproveInstallation,
  useRejectInstallation,
  type AdminPendingInstallation,
} from "@/hooks/useMissions";
import { toast } from "sonner";

const PROOF_LABELS: Record<string, string> = {
  face_avant: "Face avant",
  face_arriere: "Face arrière",
  profil_gauche: "Profil gauche",
  profil_droit: "Profil droit",
};

const PROOF_ORDER = ["face_avant", "face_arriere", "profil_gauche", "profil_droit"];

// ─────────────────────────────────────────────────────────────────────────────
// Lightbox
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 hover:bg-white/20 transition"
        aria-label="Fermer"
        onClick={onClose}
      >
        <X className="h-6 w-6 text-white" />
      </button>
      <div
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={label}
          className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
        <p className="text-white/80 text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Modal de rejet
// ─────────────────────────────────────────────────────────────────────────────
function RejectModal({
  missionId,
  poseurName,
  onConfirm,
  onCancel,
}: {
  missionId: string;
  poseurName: string;
  onConfirm: (missionId: string, reason: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = reason.trim().length >= 10 && !submitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm(missionId, reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        <div className="bg-rose-600 text-white px-6 py-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold leading-tight">Rejeter les photos</h2>
            <p className="text-sm text-rose-100 mt-0.5">Mission de {poseurName}</p>
          </div>
          <button
            onClick={onCancel}
            className="ml-auto rounded-full p-1 hover:bg-rose-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 text-sm text-amber-800 dark:text-amber-300">
            Le poseur recevra immédiatement un email avec ce motif et devra soumettre de nouvelles
            photos depuis le terrain.
          </div>

          <div>
            <label htmlFor="reject-reason" className="block text-sm font-semibold mb-1.5">
              Motif du refus <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Ex : Photo 'Face avant' floue, sticker mal posé côté droit, mauvais véhicule photographié…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/40"
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right mt-0.5">
              {reason.length}/500 — 10 caractères minimum
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end bg-background">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="rounded-xl bg-rose-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Rejeter & notifier le poseur
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Carte d'une mission en attente
// ─────────────────────────────────────────────────────────────────────────────
function MissionCard({
  mission,
  onApprove,
  onReject,
  approving,
}: {
  mission: AdminPendingInstallation;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approving: string | null;
}) {
  const [lightbox, setLightbox] = useState<{ src: string; label: string } | null>(null);

  const proofsByType = Object.fromEntries(
    (mission.mission_proofs ?? []).map((p) => [p.proof_type, p]),
  );

  const submittedAt = mission.validation_submitted_at
    ? new Date(mission.validation_submitted_at).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <>
      {lightbox && (
        <Lightbox src={lightbox.src} label={lightbox.label} onClose={() => setLightbox(null)} />
      )}

      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* En-tête de la carte */}
        <div className="px-5 py-4 border-b border-border flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  mission.mission_type === "pose"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                }`}
              >
                {mission.mission_type === "pose" ? "Pose" : "Dépose"}
              </span>
              <span className="text-xs text-muted-foreground font-mono">
                #{mission.id.slice(0, 8)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {mission.payee_profiles?.full_name ?? "Poseur inconnu"}
              </span>
              {submittedAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Soumis le {submittedAt}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => onApprove(mission.id)}
              disabled={approving === mission.id}
              className="flex items-center gap-1.5 rounded-xl bg-green-600 text-white px-4 py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {approving === mission.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Approuver
            </button>
            <button
              onClick={() => onReject(mission.id)}
              disabled={approving === mission.id}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <XCircle className="h-4 w-4" />
              Rejeter
            </button>
          </div>
        </div>

        {/* Grille 4 photos */}
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {PROOF_ORDER.map((type) => {
            const proof = proofsByType[type];
            const url = proof?.storage_url ?? null;

            return (
              <div key={type} className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-foreground">
                  {PROOF_LABELS[type]}
                  {!url && <span className="text-rose-500 ml-1">⚠</span>}
                </p>
                <div
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 cursor-pointer group ${
                    url
                      ? "border-green-300 dark:border-green-700"
                      : "border-dashed border-border bg-secondary"
                  }`}
                  onClick={() => url && setLightbox({ src: url, label: PROOF_LABELS[type] })}
                >
                  {url ? (
                    <>
                      <img
                        src={url}
                        alt={PROOF_LABELS[type]}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                        <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notes poseur */}
        {mission.provider_notes && (
          <div className="px-5 pb-4">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Note poseur :</span> {mission.provider_notes}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export function AdminInstallationModeration() {
  const { data: missions, isLoading, error, refetch } = useAdminPendingInstallations();
  const { mutateAsync: approveInstallation } = useApproveInstallation();
  const { mutateAsync: rejectInstallation } = useRejectInstallation();

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);

  const handleApprove = async (missionId: string) => {
    setApprovingId(missionId);
    try {
      await approveInstallation({ missionId });
      toast.success("Pose approuvée — campagne activée !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'approbation.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleReject = async (missionId: string, reason: string) => {
    try {
      await rejectInstallation({ missionId, rejectionReason: reason });
      toast.success("Refus envoyé — le poseur a été notifié.");
      setRejectModalId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du refus.");
      throw err;
    }
  };

  const rejectMission = rejectModalId ? (missions ?? []).find((m) => m.id === rejectModalId) : null;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Modération des poses</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Chargement…"
              : `${missions?.length ?? 0} pose(s) en attente de validation`}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      {/* États */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700 p-4 text-sm text-rose-700 dark:text-rose-300">
          Erreur lors du chargement : {error.message}
        </div>
      )}

      {!isLoading && !error && missions?.length === 0 && (
        <div className="rounded-2xl border border-border bg-secondary/40 py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="font-semibold">Aucune pose en attente de modération</p>
          <p className="text-sm">Toutes les poses ont été traitées. 🎉</p>
        </div>
      )}

      {/* Liste des missions */}
      {!isLoading &&
        missions?.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            onApprove={handleApprove}
            onReject={(id) => setRejectModalId(id)}
            approving={approvingId}
          />
        ))}

      {/* Modal de rejet */}
      {rejectModalId && rejectMission && (
        <RejectModal
          missionId={rejectModalId}
          poseurName={rejectMission.payee_profiles?.full_name ?? "Poseur"}
          onConfirm={handleReject}
          onCancel={() => setRejectModalId(null)}
        />
      )}
    </div>
  );
}
