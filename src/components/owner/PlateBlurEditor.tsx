import { useRef, useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

type Rect = { x: number; y: number; w: number; h: number };

interface Props {
  file: File;
  onDone: (blurred: File) => void;
  onCancel: () => void;
}

export function PlateBlurEditor({ file, onDone, onCancel }: Props) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [drawing, setDrawing] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const [ready, setReady] = useState(false);

  // Load image onto canvas
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      setReady(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Redraw: original image + selection rect overlay
  const redraw = useCallback((r: Rect | null) => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    if (r) {
      ctx.strokeStyle = "rgba(251,191,36,1)";
      ctx.lineWidth = Math.max(2, canvas.width / 200);
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = "rgba(251,191,36,0.15)";
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
  }, []);

  const toCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const bounds = canvas.getBoundingClientRect();
    const scaleX = canvas.width / bounds.width;
    const scaleY = canvas.height / bounds.height;
    return {
      x: (e.clientX - bounds.left) * scaleX,
      y: (e.clientY - bounds.top) * scaleY,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!ready) return;
    const pos = toCanvasCoords(e);
    startRef.current = pos;
    setDrawing(true);
    setRect(null);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing || !startRef.current) return;
    const pos = toCanvasCoords(e);
    const r: Rect = {
      x: Math.min(startRef.current.x, pos.x),
      y: Math.min(startRef.current.y, pos.y),
      w: Math.abs(pos.x - startRef.current.x),
      h: Math.abs(pos.y - startRef.current.y),
    };
    setRect(r);
    redraw(r);
  };

  const onMouseUp = () => {
    setDrawing(false);
  };

  const applyBlur = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !rect || rect.w < 4 || rect.h < 4) return;
    const ctx = canvas.getContext("2d")!;

    // Pixelate the selected region
    const PIXEL = Math.max(8, Math.min(rect.w, rect.h) / 6);
    const x = Math.round(rect.x);
    const y = Math.round(rect.y);
    const w = Math.round(rect.w);
    const h = Math.round(rect.h);

    // Draw image fresh, then pixelate zone
    ctx.drawImage(img, 0, 0);
    for (let px = x; px < x + w; px += PIXEL) {
      for (let py = y; py < y + h; py += PIXEL) {
        const data = ctx.getImageData(px, py, 1, 1).data;
        ctx.fillStyle = `rgb(${data[0]},${data[1]},${data[2]})`;
        ctx.fillRect(
          px,
          py,
          Math.min(PIXEL, x + w - px),
          Math.min(PIXEL, y + h - py),
        );
      }
    }

    // Export to File
    canvas.toBlob((blob) => {
      if (!blob) return;
      const name = file.name.replace(/(\.[^.]+)?$/, "_flou$1") || "photo_flou.jpg";
      onDone(new File([blob], name, { type: blob.type }));
    }, "image/jpeg", 0.92);
  }, [rect, file, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div>
          <p className="font-semibold text-sm">{t("owner.vehicules.blur_editor.title")}</p>
          <p className="text-xs text-muted-foreground">{t("owner.vehicules.blur_editor.instruction")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-secondary transition"
          >
            {t("owner.vehicules.blur_editor.cancel")}
          </button>
          <button
            onClick={applyBlur}
            disabled={!rect || rect.w < 4 || rect.h < 4}
            className="rounded-lg bg-amber-500 text-white px-3 py-1.5 text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("owner.vehicules.blur_editor.apply")}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full rounded-lg shadow-xl cursor-crosshair select-none"
          style={{ touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        />
      </div>
    </div>
  );
}
