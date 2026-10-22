import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import { useCoveringZone, CoveringPoint, CoveringQuad } from "@/hooks/useCoveringZone";

type Props = {
  vehicleId: string;
  rawPhotos: string[];
  onClose: () => void;
};

const LABELS = ["↖ Haut-gauche", "↗ Haut-droit", "↘ Bas-droit", "↙ Bas-gauche"];
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export function CoveringZoneEditor({ vehicleId, rawPhotos, onClose }: Props) {
  const { t } = useTranslation();
  const photos = useVehiclePhotoUrls(rawPhotos);
  const { zone, saving, saveZone, clearZone } = useCoveringZone(vehicleId);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [points, setPoints] = useState<CoveringPoint[]>(
    () => (zone?.[0]?.points ? [...zone[0].points] : []),
  );
  const [saved, setSaved] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  const handlePhotoChange = (idx: number) => {
    setPhotoIndex(idx);
    setPoints(zone?.[idx]?.points ? [...zone[idx].points] : []);
    setSaved(false);
  };

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (points.length >= 4) return;
      const rect = imgRef.current!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setPoints((prev) => [...prev, { x, y }]);
      setSaved(false);
    },
    [points.length],
  );

  const handleReset = () => {
    setPoints([]);
    setSaved(false);
  };

  const handleSave = async () => {
    if (points.length !== 4) return;
    await saveZone(photoIndex, points as CoveringQuad);
    setSaved(true);
  };

  const handleClear = async () => {
    await clearZone(photoIndex);
    setPoints([]);
    setSaved(false);
  };

  const currentPhoto = photos[photoIndex];
  const hasExistingZone = !!zone?.[photoIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">Définir la zone publicitaire</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cliquez les 4 coins de la zone covering dans l'ordre indiqué
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo selector */}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handlePhotoChange(i)}
                  className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition ${
                    i === photoIndex
                      ? "border-primary"
                      : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {zone?.[i] && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Instructions */}
          <div className="flex gap-2 flex-wrap">
            {LABELS.map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition ${
                  i < points.length
                    ? "bg-secondary border-transparent text-muted-foreground line-through"
                    : i === points.length
                      ? "border-primary text-primary font-semibold"
                      : "border-border text-muted-foreground/50"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ background: COLORS[i] }}
                />
                {i + 1}. {label}
              </div>
            ))}
          </div>

          {/* Photo with points */}
          {currentPhoto ? (
            <div
              ref={imgRef}
              className="relative rounded-xl overflow-hidden cursor-crosshair select-none"
              style={{ aspectRatio: "16/9" }}
              onClick={handleClick}
            >
              <img
                src={currentPhoto}
                alt="Véhicule"
                className="w-full h-full object-cover"
                draggable={false}
              />

              {/* Polygon fill preview */}
              {points.length === 4 && (
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={points
                      .map((p) => `${p.x * 100},${p.y * 100}`)
                      .join(" ")}
                    fill="rgba(56,130,246,0.35)"
                    stroke="#3b82f6"
                    strokeWidth="0.5"
                  />
                </svg>
              )}

              {/* Point markers */}
              {points.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-lg"
                    style={{ background: COLORS[i] }}
                  >
                    {i + 1}
                  </div>
                </div>
              ))}

              {/* Click hint overlay */}
              {points.length < 4 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
                  Clic {points.length + 1}/4 — {LABELS[points.length]}
                </div>
              )}
            </div>
          ) : (
            <div className="h-48 rounded-xl bg-secondary/40 flex items-center justify-center animate-pulse">
              <span className="text-muted-foreground text-sm">Chargement…</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-sm rounded-lg border border-border hover:bg-secondary transition"
            >
              Recommencer
            </button>

            {hasExistingZone && (
              <button
                type="button"
                onClick={handleClear}
                disabled={saving}
                className="px-3 py-1.5 text-sm rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition disabled:opacity-50"
              >
                Effacer la zone
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={points.length !== 4 || saving}
              className="ml-auto px-4 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : saved ? "✓ Enregistré" : "Confirmer la zone"}
            </button>
          </div>

          {saved && (
            <p className="text-xs text-green-600 dark:text-green-400">
              Zone enregistrée — les annonceurs verront le covering précisément sur cette zone.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
