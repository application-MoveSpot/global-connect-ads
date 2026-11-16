import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  submitIncidentReport,
  INCIDENT_TYPES,
  type IncidentType,
} from "@/lib/tracking/incident.functions";

interface Props {
  vehicleId: string;
  vehicleName: string;
  campaignRequestId?: string | null;
}

type CapturedPhoto = {
  dataUrl: string;
  b64: string;
  mime: "image/jpeg" | "image/png" | "image/webp";
};

function compressImage(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      const b64 = dataUrl.split(",")[1]!;
      resolve({ dataUrl, b64, mime: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function IncidentReportDialog({ vehicleId, vehicleName, campaignRequestId }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [incidentType, setIncidentType] = useState<IncidentType>("accident_sinistre");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submit = useServerFn(submitIncidentReport);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
    } catch {
      toast.error(t("incident.err_photo"));
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    try {
      await submit({
        data: {
          vehicleId,
          campaignRequestId: campaignRequestId ?? null,
          incidentType,
          description: description.trim() || undefined,
          photo: photo?.b64,
          photoMimeType: photo?.mime,
        },
      });
      toast.success(t("incident.toast_sent"));
      setOpen(false);
      setDescription("");
      setPhoto(null);
      setIncidentType("accident_sinistre");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("incident.err_generic"));
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-500/60"
        onClick={() => setOpen(true)}
      >
        <AlertTriangle className="mr-2 h-4 w-4" />
        {t("incident.btn_report")}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="font-semibold text-base">{t("incident.modal_title")}</h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1 hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Véhicule (informatif) */}
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">{t("incident.vehicle_label")} </span>
            <span className="font-medium">{vehicleName}</span>
          </div>

          {/* Type d'incident */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("incident.type_label")}
            </label>
            <div className="space-y-1.5">
              {INCIDENT_TYPES.map((it) => (
                <label
                  key={it.value}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    incidentType === it.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:bg-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    name="incidentType"
                    value={it.value}
                    checked={incidentType === it.value}
                    onChange={() => setIncidentType(it.value as IncidentType)}
                    className="sr-only"
                  />
                  <span
                    className={`h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 ${
                      incidentType === it.value
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  />
                  {t(it.labelKey)}
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("incident.description_label")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("incident.description_placeholder")}
              maxLength={1000}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Photo */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t("incident.photo_label")}
            </label>
            {photo ? (
              <div className="relative inline-block">
                <img
                  src={photo.dataUrl}
                  alt="Aperçu"
                  className="h-24 w-24 rounded-lg object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={compressing}
                className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                {compressing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    {t("incident.photo_cta")}
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="sr-only"
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("incident.photo_hint")}</p>
          </div>

          {/* Footer */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-amber-500 text-white hover:bg-amber-600"
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              {t("incident.btn_submit")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
