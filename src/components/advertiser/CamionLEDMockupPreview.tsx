import { useRef, useEffect, useState, useCallback } from "react";
import { RotateCcw, Maximize2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const L = 290; // cargo length (x)
const W = 115; // cargo depth  (z)
const H = 160; // cargo height (y)

const VIEWS = [
  { id: "g",   label: "Gauche",   rotY: 0   },
  { id: "3qg", label: "3/4 G",    rotY: -35 },
  { id: "arr", label: "Arrière",  rotY: -90 },
  { id: "3qd", label: "3/4 D",    rotY: -145 },
  { id: "d",   label: "Droite",   rotY: -180 },
];

type MediaInfo = { url: string; type: "video" | "image"; name?: string };

type Props = {
  screenVideoUrl?: string | null;
  logoUrl?: string | null;
  className?: string;
};

function ScreenContent({ media, brightness }: { media: MediaInfo | null; brightness?: number }) {
  if (!media) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(50,120,255,0.45)", letterSpacing: "0.15em" }}>ÉCRAN LED</span>
        <span style={{ fontSize: 8, color: "rgba(30,80,200,0.3)", letterSpacing: "0.1em" }}>Glissez votre visuel</span>
      </div>
    );
  }
  const filter = brightness != null && brightness < 1 ? `brightness(${brightness})` : undefined;
  return media.type === "video"
    ? <video src={media.url} autoPlay loop muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter }} />
    : <img src={media.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter }} />;
}

export function CamionLEDMockupPreview({ screenVideoUrl, logoUrl, className }: Props) {
  const [rotY, setRotY]           = useState(-35);
  const [isAuto, setIsAuto]       = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [media, setMedia]         = useState<MediaInfo | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragStartX   = useRef(0);
  const dragBaseAngle = useRef(-35);
  const rafRef       = useRef<number>(0);

  // Auto-rotate (counterclockwise: rotY decreases)
  useEffect(() => {
    if (!isAuto || isDragging) return;
    let last = 0;
    const tick = (t: number) => {
      if (last) setRotY(r => r - (t - last) * 0.012);
      last = t;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isAuto, isDragging]);

  // Sync props → media
  useEffect(() => {
    const url = screenVideoUrl ?? logoUrl;
    if (!url) { setMedia(null); return; }
    setMedia({ url, type: screenVideoUrl ? "video" : "image" });
  }, [screenVideoUrl, logoUrl]);

  const applyFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setMedia({ url, type: file.type.startsWith("video/") ? "video" : "image", name: file.name });
  }, []);

  // ── Event handlers ─────────────────────────────────────────────────────────
  const onMouseDown = (e: React.MouseEvent) => { setIsDragging(true); setIsAuto(false); dragStartX.current = e.clientX; dragBaseAngle.current = rotY; };
  const onMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; setRotY(dragBaseAngle.current + (e.clientX - dragStartX.current) * -0.5); };
  const onMouseUp   = () => setIsDragging(false);
  const onTouchStart = (e: React.TouchEvent) => { setIsDragging(true); setIsAuto(false); dragStartX.current = e.touches[0].clientX; dragBaseAngle.current = rotY; };
  const onTouchMove  = (e: React.TouchEvent) => { if (!isDragging) return; setRotY(dragBaseAngle.current + (e.touches[0].clientX - dragStartX.current) * -0.5); };
  const onTouchEnd   = () => setIsDragging(false);

  // Shared face style helpers
  const chromeLine = (pos: "top" | "bottom") => ({
    position: "absolute" as const,
    [pos]: 0, left: 0, right: 0, height: 6,
    background: pos === "top"
      ? "linear-gradient(180deg,#888 0%,#555 100%)"
      : "linear-gradient(180deg,#555 0%,#888 100%)",
    zIndex: 1,
  });

  const screenBox = (brightness?: number) => ({
    position: "absolute" as const, inset: "7px 5px",
    background: media ? "transparent" : "#010309",
    overflow: "hidden",
    boxShadow: media ? "0 0 40px rgba(60,120,255,0.08)" : undefined,
  });

  return (
    <div
      className={cn(
        "rounded-2xl border border-border overflow-hidden bg-[#070810] relative select-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-0",
        className,
      )}
      style={{ height: isFullscreen ? "100dvh" : 520 }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) applyFile(f); }}
    >
      {/* ── 3D scene ────────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ perspective: "1400px", perspectiveOrigin: "50% 48%" }}
      >
        {/* Ground glow */}
        <div style={{
          position: "absolute", bottom: "18%", left: "15%", right: "15%", height: 20,
          background: "radial-gradient(ellipse, rgba(20,60,200,0.10) 0%, transparent 70%)",
          filter: "blur(14px)",
        }} />

        {/* Cargo box (rotate around Y) */}
        <div
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(-8deg) rotateY(${rotY}deg)`,
            width: L, height: H,
            position: "relative",
            cursor: isDragging ? "grabbing" : "grab",
          }}
        >
          {/* ════ LEFT FACE — LED screen ════ */}
          <div style={{
            position: "absolute", width: L, height: H, left: 0, top: 0,
            transform: `translateZ(${W / 2}px)`,
            background: "#0c0c12", border: "1px solid #1e1e2a",
            overflow: "hidden", backfaceVisibility: "hidden",
          }}>
            <div style={chromeLine("top")} />
            <div style={chromeLine("bottom")} />
            <div style={screenBox()}>
              <ScreenContent media={media} />
            </div>
          </div>

          {/* ════ RIGHT FACE — LED screen ════ */}
          <div style={{
            position: "absolute", width: L, height: H, left: 0, top: 0,
            transform: `rotateY(180deg) translateZ(${W / 2}px)`,
            background: "#0c0c12", border: "1px solid #1e1e2a",
            overflow: "hidden", backfaceVisibility: "hidden",
          }}>
            <div style={chromeLine("top")} />
            <div style={chromeLine("bottom")} />
            <div style={screenBox()}>
              <ScreenContent media={media} />
            </div>
          </div>

          {/* ════ REAR FACE — LED screen ════ */}
          <div style={{
            position: "absolute", width: W, height: H,
            left: (L - W) / 2, top: 0,
            transform: `rotateY(-90deg) translateZ(${L / 2}px)`,
            background: "#0a0a10", border: "1px solid #18181f",
            overflow: "hidden", backfaceVisibility: "hidden",
          }}>
            <div style={{ ...chromeLine("top"), height: 5 }} />
            <div style={{ ...chromeLine("bottom"), height: 5 }} />
            {/* Rear lights */}
            <div style={{ position: "absolute", bottom: 24, left: 4, width: 7, height: 20, background: "rgba(255,30,30,0.85)", borderRadius: 1, zIndex: 2 }} />
            <div style={{ position: "absolute", bottom: 24, right: 4, width: 7, height: 20, background: "rgba(255,30,30,0.85)", borderRadius: 1, zIndex: 2 }} />
            <div style={{ position: "absolute", inset: "6px 4px", background: media ? "transparent" : "#010209", overflow: "hidden" }}>
              <ScreenContent media={media} brightness={0.8} />
            </div>
          </div>

          {/* ════ FRONT FACE — cab connection ════ */}
          <div style={{
            position: "absolute", width: W, height: H,
            left: (L - W) / 2, top: 0,
            transform: `rotateY(90deg) translateZ(${L / 2}px)`,
            background: "linear-gradient(160deg,#141418 0%,#0e0e12 100%)",
            border: "1px solid #1a1a22",
            overflow: "hidden", backfaceVisibility: "hidden",
          }}>
            <div style={{ position: "absolute", inset: "10px 8px", background: "#0a0a0f", borderRadius: 3, border: "1px solid #151518" }} />
          </div>

          {/* ════ TOP FACE ════ */}
          <div style={{
            position: "absolute", width: L, height: W,
            left: 0, top: (H - W) / 2,
            transform: `rotateX(-90deg) translateZ(${H / 2}px)`,
            background: "linear-gradient(180deg,#151519 0%,#0e0e12 100%)",
            border: "1px solid #1e1e28",
            backfaceVisibility: "hidden",
          }} />

          {/* ════ BOTTOM FACE ════ */}
          <div style={{
            position: "absolute", width: L, height: W,
            left: 0, top: (H - W) / 2,
            transform: `rotateX(90deg) translateZ(${H / 2}px)`,
            background: "#060608",
            backfaceVisibility: "hidden",
          }} />
        </div>
      </div>

      {/* ── View presets ────────────────────────────────────────────────────── */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {VIEWS.map(v => {
          const diff = Math.abs(((rotY - v.rotY) % 360 + 540) % 360 - 180);
          const active = diff < 22;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => { setIsAuto(false); setRotY(v.rotY); }}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] border transition-all",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-black/50 text-white/50 border-white/15 hover:border-white/30 hover:text-white/75",
              )}
            >
              {v.label}
            </button>
          );
        })}
      </div>

      {/* ── Controls panel ──────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 z-10">
        <div className="rounded-xl bg-black/75 backdrop-blur-md border border-white/10 p-3 w-52">
          <div className="text-[10px] font-semibold text-white/45 uppercase tracking-widest mb-0.5">
            Camion Écran LED
          </div>
          <div className="text-sm font-bold text-white mb-3">
            📺 3 faces indépendantes
          </div>

          {media ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className={cn("text-xs font-semibold truncate", media.type === "video" ? "text-blue-400" : "text-green-400")}>
                  {media.type === "video" ? "🎬" : "🖼"} {media.name ?? "Visuel appliqué"}
                </div>
                <div className="text-[10px] text-white/35 mt-0.5">Gauche · Arrière · Droite</div>
              </div>
              <button
                onClick={() => setMedia(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition shrink-0"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 border-dashed cursor-pointer transition",
                isDragOver ? "border-primary bg-primary/10" : "border-white/18 hover:border-white/35 hover:bg-white/4",
              )}
            >
              <Upload size={18} className="text-white/45" />
              <span className="text-xs text-white/55 text-center leading-snug">
                Glisser, <span className="text-primary font-semibold">choisir</span>
              </span>
              <span className="text-[10px] text-white/28">MP4 · PNG · JPG · WEBM</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                onChange={e => { const f = e.target.files?.[0]; if (f) applyFile(f); e.target.value = ""; }}
                className="hidden"
              />
            </label>
          )}

          <div className="mt-2 text-[10px] text-white/28 text-center">
            Glisser pour pivoter · 3 faces LED
          </div>
        </div>
      </div>

      {/* Auto-rotate toggle */}
      <button
        onClick={() => setIsAuto(v => !v)}
        className="absolute top-4 right-14 z-10 p-2 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-white/40 hover:text-white/70 transition"
        title={isAuto ? "Pause" : "Rotation auto"}
      >
        <span className="text-xs">{isAuto ? "⏸" : "▶"}</span>
      </button>

      {/* Fullscreen */}
      <button
        onClick={() => setIsFullscreen(v => !v)}
        className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/60 backdrop-blur border border-white/10 text-white/40 hover:text-white/70 transition"
      >
        <Maximize2 size={14} />
      </button>

      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-primary/10 border-2 border-primary border-dashed rounded-2xl pointer-events-none">
          <div className="text-primary font-semibold text-sm">Déposez votre visuel</div>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-14 right-4 z-10 pointer-events-none">
        <div className="text-[10px] text-white/15 font-medium tracking-wide">
          MoveSpot · Camion LED 3D
        </div>
      </div>
    </div>
  );
}
