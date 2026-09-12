import { useRef, useState } from "react";
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
      toast.error("Impossible de traiter une photo");
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
      const photoMsg = res.photoCount > 0 ? ` (${res.photoCount} photo${res.photoCount > 1 ? "s" : ""} jointe${res.photoCount > 1 ? "s" : ""})` : "";
      toast.success(`Signalement enregistré${photoMsg}`);
      setOpen(false);
      setDescription("");
      setObstacleType("travaux");
      setPhotos([]);
    } catch {
      toast.error("Échec du signalement — réessayez");
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
        ⚠️ Signaler un obstacle / condition
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-amber-800 dark:text-amber-300">Signaler un obstacle</h3>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
          Annuler
        </button>
      </div>

      {/* Type d'obstacle */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Type</label>
        <div className="grid grid-cols-2 gap-2">
          {OBSTACLE_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setObstacleType(t.value)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium text-left transition-colors ${
                obstacleType === t.value
                  ? "border-amber-500 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200"
                  : "border-border bg-card text-muted-foreground hover:border-amber-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Description <span className="normal-case">(optionnel)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex : cortège bloquant l'avenue principale, verglas rue Victor Hugo…"
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className="text-[10px] text-muted-foreground text-right">{description.length}/500</p>
      </div>

      {/* Durée estimée */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Durée estimée de l'obstacle</label>
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
            ? `Les métriques GPS seront neutralisées pendant ${impactDuration} min après validation admin.`
            : "La fenêtre d'impact sera définie manuellement par l'admin."}
        </p>
      </div>

      {/* Preuves photographiques */}
      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">
          Preuves photographiques <span className="normal-case text-muted-foreground">(max 4)</span>
        </label>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden border border-border aspect-video bg-secondary/30">
                <img src={p.dataUrl} alt={`Preuve ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-0.5 hover:bg-black/80"
                  aria-label="Supprimer"
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
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</>
                : <><Camera className="w-4 h-4" /> Prendre / choisir une photo</>
              }
            </button>
          </>
        )}

        <p className="text-[10px] text-muted-foreground">
          Les photos sont chiffrées et accessibles uniquement à l'équipe MoveSpot. Elles servent de preuve en cas de contestation.
        </p>
      </div>

      <p className="text-xs text-muted-foreground">
        Ce signalement horodaté sera enregistré. Si l'événement est avéré, les métriques de la période pourront être neutralisées pour votre rémunération.
      </p>

      <button
        onClick={submit}
        disabled={sending || compressing}
        className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {sending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours…</>
          : `Envoyer le signalement${photos.length > 0 ? ` + ${photos.length} photo${photos.length > 1 ? "s" : ""}` : ""}`
        }
      </button>
    </div>
  );
}
