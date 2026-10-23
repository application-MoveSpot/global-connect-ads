import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import { useCoveringZone, CoveringPoint, CoveringQuad } from "@/hooks/useCoveringZone";
import { normalizeCoveringQuad, zoneForPhoto } from "@/lib/fleet/covering-geometry";

type Props = {
  vehicleId: string;
  rawPhotos: string[];
  onClose: () => void;
};

const LABELS = ["↖ Haut-gauche", "↗ Haut-droit", "↘ Bas-droit", "↙ Bas-gauche"];
const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444"];

export function CoveringZoneEditor({ vehicleId, rawPhotos, onClose }: Props) {
  const photos = useVehiclePhotoUrls(rawPhotos);
  const { zone, loading, saving, error, saveZone, clearZone } = useCoveringZone(vehicleId);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [points, setPoints] = useState<CoveringPoint[]>(() =>
    zone?.[0]?.points ? [...zone[0].points] : [],
  );
  const [saved, setSaved] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<number | null>(null);
  const validQuad = normalizeCoveringQuad(points);

  useEffect(() => {
    if (!loading)
      setPoints([...(zoneForPhoto(zone, photoIndex, rawPhotos[photoIndex])?.points ?? [])]);
  }, [loading, zone, photoIndex, rawPhotos]);

  const handlePhotoChange = (idx: number) => {
    setPhotoIndex(idx);
    setPoints([...(zoneForPhoto(zone, idx, rawPhotos[idx])?.points ?? [])]);
    setSaved(false);
  };

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (loading || saving || points.length >= 4 || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setPoints((prev) => [...prev, { x, y }]);
      setSaved(false);
    },
    [points.length, loading, saving],
  );

  const handleReset = () => {
    setPoints([]);
    setSaved(false);
  };

  const moveCorner = (index: number, clientX: number, clientY: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect?.width || !rect.height || loading || saving) return;
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setPoints((current) => current.map((point, i) => i === index ? { x, y } : point));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!validQuad) return;
    setSaved(await saveZone(photoIndex, validQuad, rawPhotos[photoIndex]));
  };

  const handleClear = async () => {
    if (await clearZone(photoIndex)) {
      setPoints([]);
      setSaved(false);
    }
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
                <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                {i + 1}. {label}
              </div>
            ))}
          </div>

          {/* Photo with points */}
          {currentPhoto ? (
            <div
              ref={imgRef}
              data-covering-editor-photo
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
                    points={points.map((p) => `${p.x * 100},${p.y * 100}`).join(" ")}
                    fill="rgba(56,130,246,0.35)"
                    stroke="#3b82f6"
                    strokeWidth="0.5"
                  />
                </svg>
              )}

              {/* Point markers */}
              {points.map((p, i) => (
                <Button
                  key={i}
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Coin ${i + 1}`}
                  title={`Coin ${i + 1}`}
                  disabled={loading || saving}
                  className="absolute z-10 size-7 min-w-0 touch-none rounded-full border-2 border-background bg-primary text-primary-foreground p-0 text-xs font-bold shadow cursor-grab active:cursor-grabbing"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    draggingRef.current = i;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => {
                    if (draggingRef.current === i) moveCorner(i, event.clientX, event.clientY);
                  }}
                  onPointerUp={(event) => {
                    draggingRef.current = null;
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                  }}
                  onPointerCancel={() => { draggingRef.current = null; }}
                  onLostPointerCapture={() => { draggingRef.current = null; }}
                  onKeyDown={(event) => {
                    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
                    const rect = imgRef.current?.getBoundingClientRect();
                    if (!direction || !rect) return;
                    event.preventDefault();
                    const step = event.shiftKey ? 5 : 1;
                    moveCorner(i, rect.left + p.x * rect.width + (direction[0] ?? 0) * step, rect.top + p.y * rect.height + (direction[1] ?? 0) * step);
                  }}
                  style={{
                    left: `${p.x * 100}%`,
                    top: `${p.y * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {i + 1}
                </Button>
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
              disabled={!validQuad || saving || loading}
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
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {points.length === 4 && !validQuad && (
            <p role="alert" className="text-sm text-destructive">
              Zone croisée ou trop petite : repositionnez les quatre coins.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
