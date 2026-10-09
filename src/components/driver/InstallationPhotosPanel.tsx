import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resizeImageFile } from "@/lib/images/resize";
import { captureError } from "@/lib/sentry";
import {
  INSTALLATION_VIEWS,
  submitInstallationPhotos,
  type InstallationView,
} from "@/lib/providers/installation.functions";
import {
  InstallationPhotoGrid,
  parseInstallationPhotos,
} from "@/components/driver/InstallationPhotoGrid";
import { StatusHistory } from "@/components/shared/StatusHistory";
import { validateInstallationPhotos, type InstallationPhotoResult } from "@/lib/ai/visual-validation.functions";

type Props = {
  campaignRequestId: string;
  installationPhotos: unknown;
  installationStatus: string | null;
  installationNotes: string | null;
  onSubmitted?: () => void;
};


function getGeolocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

export function InstallationPhotosPanel({
  campaignRequestId,
  installationPhotos,
  installationStatus,
  installationNotes,
  onSubmitted,
}: Props) {
  const { t } = useTranslation();
  const submit = useServerFn(submitInstallationPhotos);
  const [files, setFiles] = useState<Partial<Record<InstallationView, File>>>({});
  const [busy, setBusy] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "ok" | "skipped">("idle");
  const [aiValidation, setAiValidation] = useState<InstallationPhotoResult | null>(null);
  const [aiValidating, setAiValidating] = useState(false);

  const STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: t("install_photos.status_pending"), className: "text-muted-foreground" },
    pending_approval: { label: t("install_photos.status_pending_approval"), className: "text-amber-500" },
    approved: { label: t("install_photos.status_approved"), className: "text-emerald-500" },
    rejected: { label: t("install_photos.status_rejected"), className: "text-destructive" },
  };

  const existing = parseInstallationPhotos(installationPhotos);
  const status = STATUS[installationStatus ?? "pending"] ?? STATUS["pending"]!;
  const allFilesSelected = INSTALLATION_VIEWS.every((v) => files[v]);
  const canSubmit = allFilesSelected && !busy && !aiValidating;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(((reader.result as string).split(",")[1]) ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFileChange = async (view: InstallationView, file: File | undefined) => {
    const nextFiles = { ...files, [view]: file };
    setFiles(nextFiles);
    setAiValidation(null);

    // Dès que les 4 vues sont sélectionnées, lancer la validation IA
    if (INSTALLATION_VIEWS.every((v) => nextFiles[v])) {
      setAiValidating(true);
      try {
        const photos = {
          front: { base64: await fileToBase64(nextFiles.front!), mimeType: nextFiles.front!.type },
          left: { base64: await fileToBase64(nextFiles.left!), mimeType: nextFiles.left!.type },
          right: { base64: await fileToBase64(nextFiles.right!), mimeType: nextFiles.right!.type },
          rear: { base64: await fileToBase64(nextFiles.rear!), mimeType: nextFiles.rear!.type },
        };
        const result = await validateInstallationPhotos({ data: { photos } });
        setAiValidation(result);
      } catch {
        // silencieux — l'upload peut continuer sans validation
      } finally {
        setAiValidating(false);
      }
    }
  };

  const handleSubmit = async () => {
    setBusy(true);
    let coords: { lat: number; lng: number } | null = null;
    try {
      // Capture géolocalisation avant l'envoi
      setGeoStatus("locating");
      coords = await getGeolocation();
      setGeoStatus(coords ? "ok" : "skipped");

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error(t("install_photos.err_session"));

      const paths: Record<string, string> = {};
      for (const view of INSTALLATION_VIEWS) {
        const file = files[view]!;
        const resized = await resizeImageFile(file, 1600, 0.85);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${uid}/installations/${campaignRequestId}/${view}-${Date.now()}.${ext}`;
        const { error } = await supabase.storage
          .from("campaign-creatives")
          .upload(path, resized, { upsert: true });
        if (error) throw new Error(error.message);
        paths[view] = path;
      }

      await submit({
        data: {
          campaignRequestId,
          photos: paths as { front: string; left: string; right: string; rear: string },
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        },
      });
      toast.success(t("install_photos.toast_success"));
      setFiles({});
      setGeoStatus("idle");
      onSubmitted?.();
    } catch (e) {
      toast.error((e as Error).message);
      captureError(e, "upload", { flow: "installation_photos", campaignRequestId });
      setGeoStatus("idle");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("install_photos.panel_title")}</p>
        <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
      </div>
      {installationNotes ? (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {t("install_photos.notes_prefix", { notes: installationNotes })}
        </p>
      ) : null}

      <div className="mb-3">
        <StatusHistory
          entityType="campaign_installation"
          entityId={campaignRequestId}
          statusLabel={{
            pending: t("install_photos.history_label_pending"),
            pending_approval: t("install_photos.history_label_pending_approval"),
            approved: t("install_photos.history_label_approved"),
            rejected: t("install_photos.history_label_rejected"),
          }}
          triggerLabel={t("install_photos.history_trigger")}
        />
      </div>

      {existing ? (
        <div className="mb-3">
          <InstallationPhotoGrid photos={existing} />
        </div>
      ) : null}

      {installationStatus !== "approved" ? (
        <>
          <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 space-y-1">
            <p className="font-semibold">{t("install_photos.checklist_title")}</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>{t("install_photos.checklist_1")}</li>
              <li>{t("install_photos.checklist_2")}</li>
              <li>{t("install_photos.checklist_3")}</li>
            </ul>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("install_photos.instructions")}
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {INSTALLATION_VIEWS.map((view) => (
              <label key={view} className="text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  {t(`installation_view.${view}`)}
                  {aiValidation?.perView[view] && (
                    <span>{aiValidation.perView[view].ok ? "✅" : "⚠️"}</span>
                  )}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleFileChange(view, e.target.files?.[0])}
                  className="mt-1 block w-full text-[11px]"
                />
                {aiValidation?.perView[view] && !aiValidation.perView[view].ok && (
                  <p className="mt-0.5 text-[10px] text-amber-600 dark:text-amber-400 leading-tight">
                    {aiValidation.perView[view].note}
                  </p>
                )}
              </label>
            ))}
          </div>

          {aiValidating && (
            <div className="mt-2 flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400 animate-pulse">
              <span className="inline-block w-3 h-3 border-2 border-violet-400/30 border-t-violet-500 rounded-full animate-spin" />
              {t("install_photos.ai_validating")}
            </div>
          )}

          {aiValidation && !aiValidating && (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${aiValidation.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/5"}`}>
              <p className={`font-medium ${aiValidation.ok ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                {aiValidation.globalNote}
              </p>
            </div>
          )}

          {geoStatus === "locating" && (
            <p className="mt-2 text-[11px] text-muted-foreground animate-pulse">
              {t("install_photos.geo_locating")}
            </p>
          )}
          {geoStatus === "ok" && (
            <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
              {t("install_photos.geo_ok")}
            </p>
          )}
          {geoStatus === "skipped" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("install_photos.geo_skipped")}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("install_photos.btn_sending") : t("install_photos.btn_submit")}
          </button>
        </>
      ) : null}
    </div>
  );
}
