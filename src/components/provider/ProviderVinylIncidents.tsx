import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Camera, Clock, Loader2, X, CheckCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  listInstallerPendingIncidents,
  submitInstallerConfirmation,
  INSTALLER_DIAGNOSIS_TYPES,
  type InstallerPendingIncident,
} from "@/lib/tracking/incident.functions";
import { getIncidentPhotoUrl } from "@/lib/tracking/incident.functions";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

// ─── Compression ─────────────────────────────────────────────────────────────

type CapturedPhoto = { dataUrl: string; b64: string; mime: "image/jpeg" };

function compressImage(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      resolve({ dataUrl, b64: dataUrl.split(",")[1]!, mime: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ProviderVinylIncidents({ onConfirmed }: { onConfirmed?: () => void }) {
  const { t } = useTranslation();
  const listFn = useServerFn(listInstallerPendingIncidents);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["installer-vinyl-incidents"],
    queryFn: () => listFn({}),
  });

  const incidents = data?.incidents ?? [];

  if (isLoading) return null;
  if (incidents.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <h2 className="font-display text-lg font-bold text-red-600 dark:text-red-400">
          {t("provider.vinyl_incidents.title")}
        </h2>
        <span className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2.5 py-0.5">
          {incidents.length}
        </span>
      </div>
      <div className="space-y-4">
        {incidents.map((inc: InstallerPendingIncident) => (
          <VinylIncidentCard
            key={inc.id}
            incident={inc}
            onConfirmed={() => { refetch(); onConfirmed?.(); }}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Carte incident ───────────────────────────────────────────────────────────

function VinylIncidentCard({
  incident,
  onConfirmed,
}: {
  incident: InstallerPendingIncident;
  onConfirmed: () => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isOverdue = incident.hours_elapsed >= 48;
  const isWarning = incident.hours_elapsed >= 24 && !isOverdue;

  return (
    <div
      className={`rounded-xl border bg-card p-4 ${
        isOverdue
          ? "border-red-500/60 bg-red-50/30 dark:bg-red-950/20"
          : isWarning
          ? "border-amber-500/60 bg-amber-50/30 dark:bg-amber-950/20"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-sm">{incident.vehicle_name ?? incident.vehicle_id.slice(0, 8)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {new Date(incident.created_at).toLocaleString("fr-FR")}
          </div>
          {incident.description && (
            <div className="text-xs mt-1 italic text-muted-foreground">"{incident.description}"</div>
          )}
        </div>
        <DeadlineBadge hours={incident.hours_elapsed} />
      </div>

      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-primary hover:underline mb-3"
      >
        {expanded ? t("common.hide") : t("provider.vinyl_incidents.view_photos")}
      </button>

      {expanded && incident.owner_report_photos.length > 0 && (
        <PhotoStrip
          label="Photos signalement propriétaire"
          paths={incident.owner_report_photos}
          labelClass="text-red-600 dark:text-red-400"
        />
      )}

      {incident.status === "reported_by_owner" && (
        <ConfirmationForm incidentId={incident.id} onConfirmed={onConfirmed} />
      )}
    </div>
  );
}

// ─── Badge délai ──────────────────────────────────────────────────────────────

function DeadlineBadge({ hours }: { hours: number }) {
  const { t } = useTranslation();
  const remaining = Math.max(0, 48 - hours);
  if (hours >= 48) {
    return (
      <span className="flex items-center gap-1 text-xs font-semibold rounded-full bg-red-500/20 text-red-600 dark:text-red-400 px-2.5 py-1">
        <Clock className="h-3 w-3" />
        {t("provider.vinyl_incidents.overdue")}
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1 ${
      hours >= 24
        ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
        : "bg-secondary text-muted-foreground"
    }`}>
      <Clock className="h-3 w-3" />
      {remaining}h {t("provider.vinyl_incidents.remaining")}
    </span>
  );
}

function PhotoStrip({
  label,
  paths,
  labelClass,
  isUrls = false,
}: {
  label: string;
  paths: string[];
  labelClass?: string;
  isUrls?: boolean;
}) {
  const { t } = useTranslation();
  const getUrl = useServerFn(getIncidentPhotoUrl);
  const [urls, setUrls] = useState<string[]>(isUrls ? paths : []);

  const loadSignedUrls = async () => {
    if (isUrls || urls.length) return;
    const resolved = await Promise.all(
      paths.map((p) => getUrl({ data: { path: p } }).then((r: { signedUrl: string | null }) => r.signedUrl ?? "")),
    );
    setUrls(resolved.filter(Boolean));
  };

  if (paths.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
        {label}<br />{t("provider.vinyl_incidents.no_photos")}
      </div>
    );
  }

  return (
    <div>
      <div className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${labelClass}`}>
        {label}
      </div>
      <div
        className="flex flex-col gap-1.5 cursor-pointer"
        onClick={loadSignedUrls}
      >
        {(urls.length ? urls : paths).map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`${label} ${i + 1}`}
            className="w-full aspect-video object-cover rounded-lg border border-border"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ))}
        {!urls.length && !isUrls && (
          <div className="text-xs text-primary underline">
            {t("provider.vinyl_incidents.click_to_load")}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Formulaire de confirmation du poseur ────────────────────────────────────

function ConfirmationForm({
  incidentId,
  onConfirmed,
}: {
  incidentId: string;
  onConfirmed: () => void;
}) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [sending, setSending] = useState(false);
  const submitFn = useServerFn(submitInstallerConfirmation);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(files.map(compressImage));
      setPhotos((prev) => [...prev, ...compressed].slice(0, 5));
    } catch {
      toast.error(t("incident.err_photo"));
    } finally {
      setCompressing(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async () => {
    if (photos.length < 2) { toast.error(t("incident.err_vinyl_min_photos")); return; }
    if (!diagnosis) { toast.error(t("provider.vinyl_incidents.err_diagnosis_required")); return; }
    setSending(true);
    try {
      await submitFn({
        data: {
          incidentId,
          photos: photos.map((p) => p.b64),
          photosMimeType: "image/jpeg",
          diagnosis: diagnosis as "installation_defect" | "material_defect" | "owner_misuse" | "external_damage",
          notes: notes.trim() || undefined,
        },
      });
      toast.success(t("provider.vinyl_incidents.toast_confirmed"));
      onConfirmed();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.network"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-border pt-3 mt-1 space-y-3">
      <p className="text-xs font-semibold text-foreground">
        {t("provider.vinyl_incidents.confirm_title")}
      </p>

      {/* Photos poseur */}
      <div>
        <div className="text-xs text-muted-foreground mb-1.5">
          {t("provider.vinyl_incidents.your_photos")}
          <span className="ml-1 font-medium">{photos.length}/2 min</span>
        </div>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p.dataUrl} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded-lg object-cover border border-border" />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 rounded-full bg-destructive p-0.5 text-destructive-foreground shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 5 && (
          <button
            type="button"
            onClick={() => inputRef?.click()}
            disabled={compressing}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed text-sm transition-colors ${
              photos.length < 2
                ? "border-amber-500/60 text-amber-600 hover:border-amber-500"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {compressing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Camera className="h-4 w-4" /> {t("incident.photo_cta")}</>}
          </button>
        )}
        <input
          ref={setInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFiles}
          className="sr-only"
        />
      </div>

      {/* Diagnostic */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          {t("provider.vinyl_incidents.diagnosis_label")} *
        </label>
        <div className="space-y-1">
          {INSTALLER_DIAGNOSIS_TYPES.map((d) => (
            <label
              key={d.value}
              className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                diagnosis === d.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <input
                type="radio"
                name={`diagnosis-${incidentId}`}
                value={d.value}
                checked={diagnosis === d.value}
                onChange={() => setDiagnosis(d.value)}
                className="sr-only"
              />
              <span className={`h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 ${diagnosis === d.value ? "border-primary bg-primary" : "border-muted-foreground"}`} />
              {t(d.labelKey)}
            </label>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">
          {t("provider.vinyl_incidents.notes_label")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("provider.vinyl_incidents.notes_placeholder")}
          rows={2}
          maxLength={1000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={sending || photos.length < 2 || !diagnosis}
        className="w-full"
      >
        {sending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        {photos.length < 2
          ? t("incident.btn_need_more_photos", { n: 2 - photos.length })
          : t("provider.vinyl_incidents.btn_confirm")}
      </Button>
    </div>
  );
}
