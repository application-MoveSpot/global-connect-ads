import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resizeImageFile } from "@/lib/images/resize";
import { captureError } from "@/lib/sentry";
import {
  INSTALLATION_VIEWS,
  INSTALLATION_VIEW_LABEL,
  submitDeposePhotos,
  type InstallationView,
} from "@/lib/providers/installation.functions";
import {
  InstallationPhotoGrid,
  parseInstallationPhotos,
} from "@/components/driver/InstallationPhotoGrid";
import { StatusHistory } from "@/components/shared/StatusHistory";

type Props = {
  campaignRequestId: string;
  deposePhotos: unknown;
  deposeStatus: string | null;
  deposeNotes: string | null;
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

export function DeposePhotosPanel({
  campaignRequestId,
  deposePhotos,
  deposeStatus,
  deposeNotes,
  onSubmitted,
}: Props) {
  const { t } = useTranslation();
  const submit = useServerFn(submitDeposePhotos);
  const [files, setFiles] = useState<Partial<Record<InstallationView, File>>>({});
  const [busy, setBusy] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "ok" | "skipped">("idle");

  const STATUS: Record<string, { label: string; className: string }> = {
    pending: { label: t("depose_photos.status_pending"), className: "text-muted-foreground" },
    pending_approval: { label: t("depose_photos.status_pending_approval"), className: "text-amber-500" },
    approved: { label: t("depose_photos.status_approved"), className: "text-emerald-500" },
    rejected: { label: t("depose_photos.status_rejected"), className: "text-destructive" },
  };

  const existing = parseInstallationPhotos(deposePhotos);
  const status = STATUS[deposeStatus ?? "pending"] ?? STATUS["pending"]!;
  const allFilesSelected = INSTALLATION_VIEWS.every((v) => files[v]);
  const canSubmit = allFilesSelected && !busy;

  const handleSubmit = async () => {
    setBusy(true);
    let coords: { lat: number; lng: number } | null = null;
    try {
      setGeoStatus("locating");
      coords = await getGeolocation();
      setGeoStatus(coords ? "ok" : "skipped");

      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error(t("depose_photos.err_session"));

      const paths: Record<string, string> = {};
      for (const view of INSTALLATION_VIEWS) {
        const file = files[view]!;
        const resized = await resizeImageFile(file, 1600, 0.85);
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${uid}/depositions/${campaignRequestId}/${view}-${Date.now()}.${ext}`;
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
      toast.success(t("depose_photos.toast_success"));
      setFiles({});
      setGeoStatus("idle");
      onSubmitted?.();
    } catch (e) {
      toast.error((e as Error).message);
      captureError(e, "upload", { flow: "depose_photos", campaignRequestId });
      setGeoStatus("idle");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-4 rounded-xl border border-border bg-secondary/20 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{t("depose_photos.panel_title")}</p>
        <span className={`text-xs font-semibold ${status.className}`}>{status.label}</span>
      </div>
      {deposeNotes ? (
        <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
          {t("depose_photos.notes_prefix", { notes: deposeNotes })}
        </p>
      ) : null}

      <div className="mb-3">
        <StatusHistory
          entityType="campaign_depose"
          entityId={campaignRequestId}
          statusLabel={{
            pending: t("depose_photos.status_history_pending"),
            pending_approval: t("depose_photos.status_history_pending_approval"),
            approved: t("depose_photos.status_history_approved"),
            rejected: t("depose_photos.status_history_rejected"),
          }}
          triggerLabel={t("depose_photos.history_trigger")}
        />
      </div>

      {existing ? (
        <div className="mb-3">
          <InstallationPhotoGrid photos={existing} />
        </div>
      ) : null}

      {deposeStatus !== "approved" ? (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {t("depose_photos.instructions")}
          </p>
          <div className="grid gap-2 sm:grid-cols-4">
            {INSTALLATION_VIEWS.map((view) => (
              <label key={view} className="text-[11px] text-muted-foreground">
                <span>{INSTALLATION_VIEW_LABEL[view]}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFiles((prev) => ({ ...prev, [view]: e.target.files?.[0] }))}
                  className="mt-1 block w-full text-[11px]"
                />
              </label>
            ))}
          </div>

          {geoStatus === "locating" && (
            <p className="mt-2 text-[11px] text-muted-foreground animate-pulse">
              {t("depose_photos.geo_locating")}
            </p>
          )}
          {geoStatus === "ok" && (
            <p className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400">
              {t("depose_photos.geo_ok")}
            </p>
          )}
          {geoStatus === "skipped" && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t("depose_photos.geo_skipped")}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? t("depose_photos.btn_sending") : t("depose_photos.btn_submit")}
          </button>
        </>
      ) : null}
    </div>
  );
}
