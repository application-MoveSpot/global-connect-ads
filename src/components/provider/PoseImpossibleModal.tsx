/**
 * PoseImpossibleModal — Art. 15bis CGU
 *
 * Modal de signalement de pose impossible pour le poseur certifié.
 * Exige ≥ 2 photos horodatées et affiche le rappel juridique sur les frais
 * de déplacement.
 */

import { useState, useRef } from "react";
import { AlertTriangle, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useReportPoseImpossible } from "@/hooks/useMissions";
import { toast } from "sonner";

interface PoseImpossibleModalProps {
  missionId: string;
  missionType: "pose" | "depose";
  scheduledDate: string | null;
  payeeUserId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface PhotoPreview {
  file: File;
  preview: string;
  path: string | null;
  url: string | null;
  uploading: boolean;
  error: string | null;
}

export function PoseImpossibleModal({
  missionId,
  missionType,
  scheduledDate,
  payeeUserId,
  onSuccess,
  onCancel,
}: PoseImpossibleModalProps) {
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: reportImpossible } = useReportPoseImpossible();

  // Vérifie si le délai 24h est encore ouvert
  const isWithin24h = (): boolean => {
    if (!scheduledDate) return true;
    const day = new Date(scheduledDate);
    day.setHours(0, 0, 0, 0);
    const deadline = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    return new Date() <= deadline;
  };

  const uploadedCount = photos.filter((p) => p.url !== null && !p.uploading).length;
  const canSubmit = reason.trim().length >= 10 && uploadedCount >= 2 && !submitting;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 5 - photos.length);
    if (selected.length === 0) return;

    // Ajouter les previews immédiates
    const newPreviews: PhotoPreview[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      path: null,
      url: null,
      uploading: true,
      error: null,
    }));
    setPhotos((prev) => [...prev, ...newPreviews]);

    // Uploader chaque photo vers Supabase Storage
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i];
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${payeeUserId}/${missionId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("pose-impossible-missions")
        .upload(path, file, { upsert: false });

      if (uploadErr) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.file === file ? { ...p, uploading: false, error: uploadErr.message } : p,
          ),
        );
        continue;
      }

      const { data: signed } = await supabase.storage
        .from("pose-impossible-missions")
        .createSignedUrl(path, 60 * 60 * 24 * 7);

      setPhotos((prev) =>
        prev.map((p) =>
          p.file === file ? { ...p, path, url: signed?.signedUrl ?? null, uploading: false } : p,
        ),
      );
    }

    // Réinitialiser l'input pour permettre la re-sélection
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    if (!isWithin24h()) {
      toast.error("Délai dépassé : signalement impossible au-delà de 24h (art. 15bis CGU).");
      return;
    }

    const readyPhotos = photos.filter((p) => p.path && !p.uploading);
    if (readyPhotos.length < 2) {
      toast.error("Attendez que les 2 photos minimum soient téléchargées.");
      return;
    }

    setSubmitting(true);
    try {
      await reportImpossible({
        mission_id: missionId,
        reason: reason.trim(),
        photo_paths: readyPhotos.map((p) => ({ path: p.path!, url: p.url })),
      });
      toast.success("Signalement enregistré. MoveSpot vous recontactera sous 7 jours ouvrés.");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du signalement.");
    } finally {
      setSubmitting(false);
    }
  };

  const deadline24h = (() => {
    if (!scheduledDate) return null;
    const day = new Date(scheduledDate);
    day.setHours(0, 0, 0, 0);
    return new Date(day.getTime() + 24 * 60 * 60 * 1000);
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        {/* En-tête */}
        <div className="bg-rose-600 text-white px-6 py-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold leading-tight">
              Signaler une {missionType === "pose" ? "pose" : "dépose"} impossible
            </h2>
            <p className="text-sm text-rose-100 mt-0.5">Art. 15bis CGU — action irréversible</p>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting}
            className="ml-auto rounded-full p-1 hover:bg-rose-700 transition shrink-0"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Avertissement irréversible */}
          <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:border-rose-700 p-4 text-sm">
            <p className="font-semibold text-rose-800 dark:text-rose-300 mb-1">
              ⚠️ Cette action est irréversible
            </p>
            <p className="text-rose-700 dark:text-rose-400">
              Elle annulera la campagne en cours et enclenchera le remboursement de l'annonceur sous{" "}
              <strong>7 jours ouvrés</strong>.
            </p>
          </div>

          {/* Rappel juridique */}
          <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 text-sm text-amber-800 dark:text-amber-300">
            <p className="font-semibold mb-1">Rappel — Art. 15bis CGU</p>
            <p>
              En validant ce signalement, vous acceptez que les{" "}
              <strong>frais de déplacement restent à votre charge exclusive</strong> en tant que
              professionnel indépendant. MoveSpot, en sa qualité d'intermédiaire, n'en est pas
              redevable.
            </p>
          </div>

          {/* Délai */}
          {deadline24h && (
            <p className="text-xs text-muted-foreground">
              Délai limite de signalement :{" "}
              <strong>
                {deadline24h.toLocaleString("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </p>
          )}

          {/* Raison */}
          <div>
            <label htmlFor="pose-impossible-reason" className="block text-sm font-semibold mb-1.5">
              Motif détaillé <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="pose-impossible-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="Ex : surface du véhicule trop endommagée (rouille), présence de rouille empêchant l'adhésion du vinyle, véhicule absent au rendez-vous…"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/40"
            />
            <p className="text-xs text-muted-foreground text-right mt-0.5">
              {reason.length}/800 — 10 caractères minimum
            </p>
          </div>

          {/* Upload photos */}
          <div>
            <p className="block text-sm font-semibold mb-1.5">
              Photos horodatées <span className="text-rose-600">*</span>
              <span className="text-muted-foreground font-normal ml-1">(2 minimum, 5 maximum)</span>
            </p>

            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-rose-400 bg-background hover:bg-rose-50 dark:hover:bg-rose-900/10 px-4 py-3 text-sm text-muted-foreground hover:text-rose-600 transition w-full mb-3"
              >
                <Upload className="h-4 w-4" />
                Ajouter des photos ({photos.length}/5)
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary"
                  >
                    <img
                      src={p.preview}
                      alt={`Preuve ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {p.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                    {p.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-rose-900/70 p-1">
                        <p className="text-white text-[10px] text-center leading-tight">
                          {p.error}
                        </p>
                      </div>
                    )}
                    {!p.uploading && !p.error && (
                      <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      disabled={submitting}
                      className="absolute top-1 left-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition"
                      aria-label="Supprimer"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {uploadedCount < 2 && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                {uploadedCount === 0
                  ? "Aucune photo chargée — 2 requises."
                  : `${uploadedCount}/2 photo(s) chargée(s) — ajoutez encore ${2 - uploadedCount}.`}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end bg-background">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-rose-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmer le signalement
          </button>
        </div>
      </div>
    </div>
  );
}
