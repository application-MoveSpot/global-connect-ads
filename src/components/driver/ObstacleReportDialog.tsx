import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { reportObstacleWithToken, OBSTACLE_TYPES, IMPACT_DURATION_OPTIONS, type ObstacleType } from "@/lib/tracking/obstacle.functions";
import { Camera, X, Loader2 } from "lucide-react";

interface Props {
  token: string;
}

type CapturedPhoto = {
  dataUrl: string;   // data:image/jpeg;base64,...  (pour l'aperçu)
  b64: string;       // base64 brut (sans préfixe)
  mime: "image/jpeg" | "image/png" | "image/webp";
};

// Redimensionne et compresse une image en JPEG, max 900px, qualité 0.75
function compressImage(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
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

export function ObstacleReportDialog({ token }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [obstacleType, setObstacleType] = useState<ObstacleType>("travaux");
  const [description, setDescription] = useState("");
  const [impactDuration, setImpactDuration] = useState<number | null>(60);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const report = useServerFn(reportObstacleWithToken);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = 4 - photos.length;
    const toProcess = files.slice(0, remaining);
    setCompressing(true);
    try {
      const compressed = await Promise.all(toProcess.map(compressImage));
      setPhotos((prev) => [...prev, ...compressed].slice(0, 4));
    } catch {
      toast.error(t("obstacle.err_photo"));
    } finally {
      setCompressing(false);
      // Reset input pour permettre de re-sélectionner le même fichier
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (idx: number) => setPhotos((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    setSending(true);
    try {
      const res = await report({
        data: {
          token,
          obstacleType,
          description: description.trim() || undefined,
          reportedAt: new Date().toISOString(),
          impactDurationMinutes: impactDuration,
          photos: photos.map((p) => p.b64),
          photoMimeTypes: photos.map((p) => p.mime),
        },
      });
      if (res.photoCount > 0) {
        toast.success(t("obstacle.success_photos", { count: res.photoCount, s: res.photoCount > 1 ? "s" : "" }));
      } else {
        toast.success(t("obstacle.success"));
      }
      setOpen(false);
      setDescription("");
      setObstacleType("travaux");
      setPhotos([]);
    } catch {
      toast.error(t("obstacle.err_submit"));
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setOpen(false);
    setDescription("");
    setObstacleType("travaux");
    setImpactDuration(60);
    setPhotos([]);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 py-3 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
      >
        ⚠️ {t("obstacle.btn_trigger")}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">{t("obstacle.dialog_title")}</h3>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
          {t("obstacle.btn_cancel")}
        </button>
      </div>

      {/* Type d'obstacle */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">{t("obstacle.label_type")}</label>
        <div className="grid grid-cols-2 gap-2">
          {OBSTACLE_TYPES.map((obsType) => (
            <button
              key={obsType.value}
              onClick={() => setObstacleType(obsType.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium text-left transition-colors ${
                obstacleType === obsType.value
                  ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                  : "border-border bg-card text-muted-foreground hover:border-amber-300"
              }`}
            >
              {obsType.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("obstacle.label_description")} <span className="normal-case">{t("obstacle.label_optional")}</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("obstacle.description_placeholder")}
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
      </div>

      {/* Durée estimée */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">{t("obstacle.label_duration")}</label>
        <div className="flex flex-wrap gap-2">
          {IMPACT_DURATION_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setImpactDuration(opt.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                impactDuration === opt.value
                  ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                  : "border-border bg-card text-muted-foreground hover:border-amber-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {impactDuration != null
            ? t("obstacle.impact_active", { min: impactDuration })
            : t("obstacle.impact_manual")}
        </p>
      </div>

      {/* Preuves photographiques */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          {t("obstacle.label_photos")} <span className="normal-case text-muted-foreground">{t("obstacle.photos_max")}</span>
        </label>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-border aspect-video bg-secondary/30">
                <img src={p.dataUrl} alt={t("obstacle.photo_alt", { n: i + 1 })} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-0.5 hover:bg-black/80"
                  aria-label={t("obstacle.btn_remove_photo")}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < 4 && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={compressing}
              className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-700 bg-transparent py-3 text-xs text-amber-700 dark:text-amber-400 font-medium hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors disabled:opacity-50"
            >
              {compressing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("obstacle.btn_compressing")}</>
                : <><Camera className="w-4 h-4" /> {t("obstacle.btn_add_photo")}</>
              }
            </button>
          </>
        )}

        <p className="text-[10px] text-muted-foreground">
          {t("obstacle.photos_info")}
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("obstacle.disclaimer")}
      </p>

      <button
        onClick={submit}
        disabled={sending || compressing}
        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {sending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("obstacle.sending")}</>
          : photos.length > 0
            ? t("obstacle.btn_submit_photos", { count: photos.length, s: photos.length > 1 ? "s" : "" })
            : t("obstacle.btn_submit")
        }
      </button>
    </div>
  );
}
