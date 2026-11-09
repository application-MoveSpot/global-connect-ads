/**
 * ValidateInstallationModal
 *
 * Formulaire de validation de pose pour le poseur certifié.
 * Exige exactement 4 photos obligatoires (face avant, face arrière,
 * profil gauche, profil droit). Le bouton de soumission reste grisé
 * tant que les 4 emplacements ne sont pas remplis.
 */

import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubmitInstallation } from "@/hooks/useMissions";
import { toast } from "sonner";

const PHOTO_SLOTS = [
  {
    key: "face_avant",
    label: "Face avant",
    description: "Vue frontale du véhicule avec le vinyle posé",
  },
  {
    key: "face_arriere",
    label: "Face arrière",
    description: "Vue arrière du véhicule avec le vinyle posé",
  },
  {
    key: "profil_gauche",
    label: "Profil gauche",
    description: "Côté conducteur, vinyl visible entier",
  },
  {
    key: "profil_droit",
    label: "Profil droit",
    description: "Côté passager, vinyl visible entier",
  },
] as const;

type PhotoSlotKey = (typeof PHOTO_SLOTS)[number]["key"];

interface SlotState {
  file: File | null;
  preview: string | null;
  storagePath: string | null;
  storageUrl: string | null;
  uploading: boolean;
  error: string | null;
}

function emptySlot(): SlotState {
  return {
    file: null,
    preview: null,
    storagePath: null,
    storageUrl: null,
    uploading: false,
    error: null,
  };
}

interface ValidateInstallationModalProps {
  missionId: string;
  missionType: "pose" | "depose";
  payeeUserId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ValidateInstallationModal({
  missionId,
  missionType,
  payeeUserId,
  onSuccess,
  onCancel,
}: ValidateInstallationModalProps) {
  const [slots, setSlots] = useState<Record<PhotoSlotKey, SlotState>>({
    face_avant: emptySlot(),
    face_arriere: emptySlot(),
    profil_gauche: emptySlot(),
    profil_droit: emptySlot(),
  });
  const [providerNotes, setProviderNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRefs = useRef<Record<PhotoSlotKey, HTMLInputElement | null>>({
    face_avant: null,
    face_arriere: null,
    profil_gauche: null,
    profil_droit: null,
  });

  const { mutateAsync: submitInstallation } = useSubmitInstallation();

  const allUploaded = PHOTO_SLOTS.every(
    ({ key }) => slots[key].storageUrl !== null && !slots[key].uploading,
  );

  const anyUploading = PHOTO_SLOTS.some(({ key }) => slots[key].uploading);

  const canSubmit = allUploaded && !submitting;

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    slotKey: PhotoSlotKey,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const preview = URL.createObjectURL(file);
    setSlots((prev) => ({
      ...prev,
      [slotKey]: { ...emptySlot(), file, preview, uploading: true },
    }));

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${payeeUserId}/${missionId}/${slotKey}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from("installation-validations")
      .upload(path, file, { upsert: false });

    if (uploadErr) {
      setSlots((prev) => ({
        ...prev,
        [slotKey]: { ...prev[slotKey], uploading: false, error: uploadErr.message },
      }));
      if (fileInputRefs.current[slotKey]) fileInputRefs.current[slotKey]!.value = "";
      return;
    }

    const { data: signed } = await supabase.storage
      .from("installation-validations")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    setSlots((prev) => ({
      ...prev,
      [slotKey]: {
        ...prev[slotKey],
        storagePath: path,
        storageUrl: signed?.signedUrl ?? null,
        uploading: false,
        error: null,
      },
    }));

    if (fileInputRefs.current[slotKey]) fileInputRefs.current[slotKey]!.value = "";
  };

  const removePhoto = (slotKey: PhotoSlotKey) => {
    const { preview } = slots[slotKey];
    if (preview) URL.revokeObjectURL(preview);
    setSlots((prev) => ({ ...prev, [slotKey]: emptySlot() }));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const photos = PHOTO_SLOTS.map(({ key }) => ({
        proof_type: key,
        storage_path: slots[key].storagePath!,
        storage_url: slots[key].storageUrl,
      }));

      await submitInstallation({
        missionId,
        photos,
        providerNotes: providerNotes.trim() || undefined,
      });

      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Rapport transmis !</h2>
          <p className="text-muted-foreground mb-6">
            Vos 4 photos ont bien été enregistrées. L'équipe MoveSpot va examiner votre travail et
            vous confirmera la validation sous <strong>48 heures ouvrées</strong>.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            La campagne de l'annonceur passera automatiquement en attente d'approbation dès
            confirmation de notre équipe.
          </p>
          <button
            onClick={onSuccess}
            className="w-full rounded-xl bg-green-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-green-700 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-background border border-border shadow-2xl overflow-hidden">
        {/* En-tête */}
        <div className="bg-green-600 text-white px-6 py-4 flex items-start gap-3">
          <Camera className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-lg font-bold leading-tight">
              Valider la {missionType === "pose" ? "pose" : "dépose"}
            </h2>
            <p className="text-sm text-green-100 mt-0.5">
              4 photos obligatoires — toutes les vues sont requises
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={submitting || anyUploading}
            className="ml-auto rounded-full p-1 hover:bg-green-700 transition shrink-0 disabled:opacity-50"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Consigne */}
          <div className="rounded-xl border border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 p-4 text-sm text-blue-800 dark:text-blue-300">
            <p className="font-semibold mb-1">Instructions</p>
            <p>
              Photographiez le véhicule sous les <strong>4 angles obligatoires</strong> pour prouver
              la bonne pose du vinyl. Toutes les photos doivent montrer clairement l'intégralité du
              marquage.
            </p>
          </div>

          {/* Grille 4 slots */}
          <div className="grid grid-cols-2 gap-3">
            {PHOTO_SLOTS.map(({ key, label, description }) => {
              const slot = slots[key];
              const hasPhoto = slot.storageUrl !== null && !slot.uploading;

              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-foreground">
                    {label}
                    {!hasPhoto && <span className="text-rose-500 ml-0.5">*</span>}
                    {hasPhoto && <span className="text-green-500 ml-1">✓</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>

                  <div
                    className="relative aspect-[4/3] rounded-xl overflow-hidden border-2 cursor-pointer transition"
                    style={{
                      borderColor: slot.error
                        ? "rgb(239,68,68)"
                        : hasPhoto
                          ? "rgb(34,197,94)"
                          : "var(--border)",
                      background: "var(--secondary)",
                    }}
                    onClick={() =>
                      !slot.uploading && !submitting && fileInputRefs.current[key]?.click()
                    }
                  >
                    {slot.preview ? (
                      <img src={slot.preview} alt={label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                        <Upload className="h-6 w-6" />
                        <span className="text-[10px]">Appuyer pour ajouter</span>
                      </div>
                    )}

                    {slot.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}

                    {slot.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-rose-900/70 p-2">
                        <p className="text-white text-[10px] text-center leading-tight">
                          {slot.error}
                        </p>
                      </div>
                    )}

                    {hasPhoto && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePhoto(key);
                        }}
                        disabled={submitting}
                        className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition"
                        aria-label="Supprimer"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>

                  <input
                    ref={(el) => {
                      fileInputRefs.current[key] = el;
                    }}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, key)}
                  />
                </div>
              );
            })}
          </div>

          {/* Compteur */}
          <p className="text-xs text-muted-foreground">
            {PHOTO_SLOTS.filter(({ key }) => slots[key].storageUrl !== null).length}/4 photos
            téléversées
            {!allUploaded && (
              <span className="text-rose-500 ml-1">
                — {PHOTO_SLOTS.filter(({ key }) => slots[key].storageUrl === null).length}{" "}
                manquante(s)
              </span>
            )}
          </p>

          {/* Notes optionnelles */}
          <div>
            <label htmlFor="validate-notes" className="block text-sm font-semibold mb-1.5">
              Notes (optionnel)
            </label>
            <textarea
              id="validate-notes"
              value={providerNotes}
              onChange={(e) => setProviderNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Observations particulières sur la pose (difficultés, état du véhicule…)"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/40"
            />
            <p className="text-xs text-muted-foreground text-right mt-0.5">
              {providerNotes.length}/500
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end bg-background">
          <button
            onClick={onCancel}
            disabled={submitting || anyUploading}
            className="rounded-xl border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-green-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Soumettre pour validation
          </button>
        </div>
      </div>
    </div>
  );
}
