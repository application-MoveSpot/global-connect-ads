import { useState, useRef, useCallback, useEffect } from "react";

export type VehicleKey = "van" | "food_truck" | "voiture" | "taxi" | "scooter" | "velo_cargo" | "triporteur" | "autre";
export type AdFormat = "covering_total" | "demi_covering" | "stickers" | "video_led" | "affiche";

type AnglePreset = { label: string; rotY: number; legend: string };
const ANGLES: AnglePreset[] = [
  { label: "Profil", rotY: 0, legend: "Vue de profil" },
  { label: "3/4 Av.", rotY: -38, legend: "Vue 3/4 avant" },
  { label: "Face", rotY: -88, legend: "Vue de face" },
  { label: "3/4 Ar.", rotY: 38, legend: "Vue 3/4 arrière" },
];

const AD_FORMATS: { v: AdFormat; l: string; desc: string }[] = [
  { v: "covering_total", l: "Covering total", desc: "Habillage complet" },
  { v: "demi_covering", l: "Demi-covering", desc: "Bas du véhicule" },
  { v: "stickers", l: "Stickers", desc: "Autocollants ciblés" },
  { v: "video_led", l: "Écran LED/Vidéo", desc: "Écran numérique" },
  { v: "affiche", l: "Affiche", desc: "Panneau fixe" },
];

// Each vehicle: viewBox 0 0 380 180
// body, adAreaFull, adAreaHalf, adAreaSticker, adAreaScreen, windows, extras
type VehicleDef = {
  label: string;
  body: string;
  wheels: { cx: number; cy: number; r: number }[];
  windows: string[];
  extras?: string[];
  adAreaFull: string;
  adAreaHalf: string;
  adAreaSticker: string[];
  adAreaScreen: string;
  frontFace: { body: string; windows: string[]; extras?: string[] };
};

const VEHICLES: Record<VehicleKey, VehicleDef> = {
  van: {
    label: "Van",
    body: "M28,148 L28,72 Q28,56 46,50 L88,40 L278,36 Q324,34 350,56 L366,74 L366,148 Z",
    wheels: [{ cx: 78, cy: 151, r: 23 }, { cx: 312, cy: 151, r: 23 }],
    windows: [
      "M36,58 L36,90 L84,88 L84,54 Z",
      "M92,48 L92,80 L158,80 L162,48 Z",
      "M170,46 L170,78 L235,78 L239,46 Z",
    ],
    adAreaFull: "M90,40 L348,40 L348,142 L90,142 Z",
    adAreaHalf: "M90,90 L348,90 L348,142 L90,142 Z",
    adAreaSticker: ["M110,55 L200,55 L200,95 L110,95 Z", "M220,55 L330,55 L330,95 L220,95 Z"],
    adAreaScreen: "M160,50 L310,50 L310,110 L160,110 Z",
    frontFace: {
      body: "M148,148 L148,70 Q148,54 160,50 L220,48 Q232,48 232,70 L232,148 Z",
      windows: ["M156,56 L156,90 L224,90 L224,56 Q224,50 190,50 Q156,50 156,56 Z"],
    },
  },
  food_truck: {
    label: "Food truck",
    body: "M22,148 L22,72 Q22,55 42,48 L90,38 L285,34 Q328,32 352,56 L368,76 L368,148 Z",
    wheels: [{ cx: 76, cy: 151, r: 23 }, { cx: 318, cy: 151, r: 23 }],
    windows: ["M30,60 L30,90 L86,88 L86,56 Z"],
    extras: [
      "M155,44 L155,100 L345,100 L345,44 Z", // serving area background
      "M162,50 L162,94 L338,94 L338,50 Z",   // serving window
    ],
    adAreaFull: "M88,38 L350,38 L350,142 L88,142 Z",
    adAreaHalf: "M88,96 L350,96 L350,142 L88,142 Z",
    adAreaSticker: ["M100,104 L200,104 L200,135 L100,135 Z", "M210,104 L340,104 L340,135 L210,135 Z"],
    adAreaScreen: "M165,52 L335,52 L335,92 L165,92 Z",
    frontFace: {
      body: "M145,148 L145,68 Q145,52 158,48 L222,46 Q235,48 235,68 L235,148 Z",
      windows: ["M154,54 L154,86 L226,86 L226,54 Z"],
    },
  },
  voiture: {
    label: "Voiture",
    body: "M35,148 L35,105 Q35,100 48,90 L78,65 L110,50 L200,46 L260,48 L295,62 L330,85 L348,108 L348,148 Z",
    wheels: [{ cx: 88, cy: 151, r: 22 }, { cx: 295, cy: 151, r: 22 }],
    windows: [
      "M82,68 L82,98 L155,98 L158,66 Z",
      "M165,64 L162,98 L248,98 L268,72 Z",
    ],
    adAreaFull: "M50,105 L340,105 L340,142 L50,142 Z",
    adAreaHalf: "M50,118 L340,118 L340,142 L50,142 Z",
    adAreaSticker: ["M65,108 L170,108 L170,140 L65,140 Z", "M185,108 L325,108 L325,140 L185,140 Z"],
    adAreaScreen: "M130,108 L280,108 L280,138 L130,138 Z",
    frontFace: {
      body: "M148,148 L148,105 Q148,92 158,82 L175,68 L205,62 L215,62 L232,68 L248,82 L232,148 Z",
      windows: ["M155,74 L155,100 L225,100 L225,74 Q225,66 190,64 Q155,64 155,74 Z"],
    },
  },
  taxi: {
    label: "Taxi",
    body: "M35,148 L35,105 Q35,100 48,90 L78,65 L110,50 L200,46 L260,48 L295,62 L330,85 L348,108 L348,148 Z",
    wheels: [{ cx: 88, cy: 151, r: 22 }, { cx: 295, cy: 151, r: 22 }],
    windows: [
      "M82,68 L82,98 L155,98 L158,66 Z",
      "M165,64 L162,98 L248,98 L268,72 Z",
    ],
    extras: ["M168,36 L168,48 L220,48 L220,36 Q220,30 194,30 Q168,30 168,36 Z"], // taxi sign
    adAreaFull: "M50,105 L340,105 L340,142 L50,142 Z",
    adAreaHalf: "M50,118 L340,118 L340,142 L50,142 Z",
    adAreaSticker: ["M65,108 L170,108 L170,140 L65,140 Z", "M185,108 L325,108 L325,140 L185,140 Z"],
    adAreaScreen: "M130,108 L280,108 L280,138 L130,138 Z",
    frontFace: {
      body: "M148,148 L148,105 Q148,92 158,82 L175,68 L205,62 L215,62 L232,68 L248,82 L232,148 Z",
      windows: ["M155,74 L155,100 L225,100 L225,74 Q225,66 190,64 Q155,64 155,74 Z"],
      extras: ["M172,38 L172,50 L208,50 L208,38 Q208,32 190,32 Q172,32 172,38 Z"],
    },
  },
  scooter: {
    label: "Scooter",
    body: "M55,148 L62,105 L78,80 L100,62 L128,54 L175,52 L210,60 L240,80 L258,105 L260,148 Z",
    wheels: [{ cx: 72, cy: 151, r: 22 }, { cx: 245, cy: 151, r: 22 }],
    windows: [],
    extras: ["M115,46 L115,58 L200,58 L200,46 Z"], // platform/body panel
    adAreaFull: "M96,66 L225,66 L225,138 L96,138 Z",
    adAreaHalf: "M96,100 L225,100 L225,138 L96,138 Z",
    adAreaSticker: ["M110,72 L210,72 L210,110 L110,110 Z"],
    adAreaScreen: "M110,72 L215,72 L215,108 L110,108 Z",
    frontFace: {
      body: "M158,148 L158,90 Q158,70 175,60 L205,56 Q222,60 222,80 L222,148 Z",
      windows: [],
    },
  },
  velo_cargo: {
    label: "Vélo cargo",
    body: "M30,148 L30,110 L45,90 L80,80 L140,76 L260,76 L305,82 L328,100 L335,148 Z",
    wheels: [{ cx: 52, cy: 151, r: 22 }, { cx: 310, cy: 151, r: 22 }],
    windows: [],
    extras: [
      "M80,50 L80,78 L260,78 L260,50 Z", // cargo box
      "M266,56 L266,82 L310,82 L310,56 Z", // rider area
    ],
    adAreaFull: "M82,52 L258,52 L258,76 L82,76 Z",
    adAreaHalf: "M82,62 L258,62 L258,76 L82,76 Z",
    adAreaSticker: ["M100,52 L200,52 L200,74 L100,74 Z"],
    adAreaScreen: "M90,52 L250,52 L250,74 L90,74 Z",
    frontFace: {
      body: "M155,148 L155,80 L175,60 L205,55 L225,60 L225,148 Z",
      windows: [],
      extras: ["M160,52 L160,78 L220,78 L220,52 Z"],
    },
  },
  triporteur: {
    label: "Triporteur",
    body: "M40,148 L40,100 L60,78 L95,65 L120,60 L260,60 L295,65 L328,80 L340,110 L340,148 Z",
    wheels: [{ cx: 65, cy: 151, r: 22 }, { cx: 315, cy: 151, r: 22 }],
    windows: [],
    extras: ["M95,35 L95,62 L265,62 L265,35 Z"], // top cargo box
    adAreaFull: "M97,37 L263,37 L263,60 L97,60 Z",
    adAreaHalf: "M97,48 L263,48 L263,60 L97,60 Z",
    adAreaSticker: ["M110,38 L200,38 L200,58 L110,58 Z"],
    adAreaScreen: "M105,38 L255,38 L255,58 L105,58 Z",
    frontFace: {
      body: "M148,148 L148,68 L168,52 L212,50 L232,66 L232,148 Z",
      windows: [],
      extras: ["M152,36 L152,62 L228,62 L228,36 Z"],
    },
  },
  autre: {
    label: "Véhicule",
    body: "M25,148 L25,68 Q25,52 45,46 L90,38 L280,34 Q326,32 352,54 L368,72 L368,148 Z",
    wheels: [{ cx: 78, cy: 151, r: 23 }, { cx: 312, cy: 151, r: 23 }],
    windows: [
      "M34,56 L34,88 L86,86 L86,52 Z",
      "M94,48 L94,80 L175,80 L179,48 Z",
    ],
    adAreaFull: "M92,40 L350,40 L350,142 L92,142 Z",
    adAreaHalf: "M92,92 L350,92 L350,142 L92,142 Z",
    adAreaSticker: ["M110,54 L220,54 L220,98 L110,98 Z", "M230,54 L340,54 L340,98 L230,98 Z"],
    adAreaScreen: "M160,52 L320,52 L320,112 L160,112 Z",
    frontFace: {
      body: "M148,148 L148,68 Q148,52 162,48 L218,46 Q232,48 232,68 L232,148 Z",
      windows: ["M156,54 L156,88 L224,88 L224,54 Z"],
    },
  },
};

const AD_OVERLAY_OPACITY: Record<AdFormat, number> = {
  covering_total: 0.72,
  demi_covering: 0.72,
  stickers: 0.85,
  video_led: 0.9,
  affiche: 0.8,
};

function getAdPath(v: VehicleDef, format: AdFormat): string[] {
  if (format === "covering_total") return [v.adAreaFull];
  if (format === "demi_covering") return [v.adAreaHalf];
  if (format === "stickers") return v.adAreaSticker;
  if (format === "video_led") return [v.adAreaScreen];
  if (format === "affiche") return [v.adAreaSticker[0] ?? v.adAreaFull];
  return [];
}

type Props = {
  vehicleTypes: string[];
  adFormat: AdFormat | null;
  brandColor: string;
  logoUrl?: string | null;
};

export function VehicleMockup3D({ vehicleTypes, adFormat, brandColor, logoUrl }: Props) {
  const [angleIdx, setAngleIdx] = useState(0);
  const [autoRotate, setAutoRotate] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [baseAngle, setBaseAngle] = useState(0);
  const [currentRotY, setCurrentRotY] = useState(0);
  const autoRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const vehicleKey: VehicleKey = (() => {
    const supported: VehicleKey[] = ["van", "food_truck", "voiture", "taxi", "scooter", "velo_cargo", "triporteur"];
    return (supported.find((k) => vehicleTypes.includes(k)) ?? "van") as VehicleKey;
  })();
  const vehicle = VEHICLES[vehicleKey];

  // Snap to nearest angle preset
  const snapToAngle = useCallback((rotY: number) => {
    const normalized = ((rotY % 360) + 360) % 360;
    const candidates = ANGLES.map((a, i) => ({ i, dist: Math.abs(((a.rotY - normalized + 540) % 360) - 180) }));
    const best = candidates.reduce((a, b) => (a.dist < b.dist ? a : b));
    setAngleIdx(best.i);
    setCurrentRotY(ANGLES[best.i].rotY);
  }, []);

  useEffect(() => {
    if (autoRotate) {
      let frame = 0;
      autoRef.current = window.setInterval(() => {
        frame++;
        const idx = frame % ANGLES.length;
        setAngleIdx(idx);
        setCurrentRotY(ANGLES[idx].rotY);
      }, 1400);
    } else {
      if (autoRef.current) clearInterval(autoRef.current);
    }
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [autoRotate]);

  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    setDragStartX(x);
    setBaseAngle(currentRotY);
  };

  const onDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const x = "touches" in e ? e.touches[0].clientX : e.clientX;
    const delta = (x - dragStartX) * 0.4;
    setCurrentRotY(baseAngle + delta);
  }, [isDragging, dragStartX, baseAngle]);

  const onDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      snapToAngle(currentRotY);
    }
  }, [isDragging, currentRotY, snapToAngle]);

  useEffect(() => {
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onDragMove);
    window.addEventListener("touchend", onDragEnd);
    return () => {
      window.removeEventListener("mousemove", onDragMove);
      window.removeEventListener("mouseup", onDragEnd);
      window.removeEventListener("touchmove", onDragMove);
      window.removeEventListener("touchend", onDragEnd);
    };
  }, [onDragMove, onDragEnd]);

  const preset = ANGLES[angleIdx];
  const isFrontView = Math.abs(currentRotY) > 60;
  const isEdgeView = Math.abs(currentRotY) > 75;
  const scaleX = isEdgeView ? 0.28 : isFrontView ? 0.55 : Math.max(0.28, 1 - Math.abs(currentRotY) / 100);

  const adPaths = adFormat ? getAdPath(vehicle, adFormat) : [];
  const opacity = adFormat ? AD_OVERLAY_OPACITY[adFormat] : 0;

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-b from-secondary/30 to-background p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prévisualisation</p>
          <p className="text-sm font-semibold">{vehicle.label} · {preset.legend}</p>
        </div>
        <button
          onClick={() => setAutoRotate((v) => !v)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${autoRotate ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}
        >
          {autoRotate ? "⏸ Stop" : "▶ Auto 360°"}
        </button>
      </div>

      {/* 3D Viewport */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center rounded-xl overflow-hidden select-none cursor-grab active:cursor-grabbing"
        style={{ height: 220, background: "linear-gradient(135deg, hsl(var(--secondary)/40%) 0%, hsl(var(--background)) 100%)" }}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
      >
        {/* Ground shadow */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/10"
          style={{ width: `${scaleX * 320}px`, height: 12, filter: "blur(8px)", transition: "all 0.3s ease" }} />

        {/* Vehicle SVG */}
        <div style={{
          transform: `perspective(900px) rotateY(${currentRotY}deg) scaleX(${scaleX})`,
          transition: isDragging ? "none" : "transform 0.45s cubic-bezier(.22,.68,0,1.2)",
          transformStyle: "preserve-3d",
          filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.18))",
        }}>
          <svg viewBox="0 0 380 180" width={isEdgeView ? 100 : 320} height={isEdgeView ? 80 : 152}
            style={{ transition: isDragging ? "none" : "all 0.45s ease", display: "block" }}>
            {/* Body */}
            <path d={vehicle.body} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />

            {/* Extras (taxi sign, food truck serving window, etc.) */}
            {vehicle.extras?.map((p, i) => (
              <path key={i} d={p} fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            ))}

            {/* Windows */}
            {vehicle.windows.map((p, i) => (
              <path key={i} d={p} fill="hsl(var(--primary)/20%)" stroke="hsl(var(--border))" strokeWidth="1.5" />
            ))}

            {/* Ad overlay */}
            {adPaths.map((p, i) => (
              <path key={i} d={p} fill={brandColor} opacity={opacity} rx="4" />
            ))}

            {/* Logo overlay on ad area */}
            {logoUrl && adFormat && adPaths[0] && (
              <image
                href={logoUrl}
                x="140" y="55" width="100" height="60"
                preserveAspectRatio="xMidYMid meet"
                opacity="0.9"
                style={{ clipPath: `path("${adPaths[0]}")` }}
              />
            )}

            {/* Screen LED effect */}
            {adFormat === "video_led" && (
              <rect x={0} y={0} width={380} height={180} fill="none">
                <animate attributeName="opacity" values="0;0.08;0" dur="2s" repeatCount="indefinite" />
              </rect>
            )}

            {/* Wheels */}
            {vehicle.wheels.map((w, i) => (
              <g key={i}>
                <circle cx={w.cx} cy={w.cy} r={w.r} fill="#1a1a2e" />
                <circle cx={w.cx} cy={w.cy} r={w.r * 0.55} fill="#2d2d4e" />
                <circle cx={w.cx} cy={w.cy} r={w.r * 0.18} fill="#4a4a6a" />
              </g>
            ))}
          </svg>
        </div>

        {/* Drag hint */}
        {!isDragging && !autoRotate && (
          <p className="absolute bottom-2 right-3 text-[10px] text-muted-foreground select-none pointer-events-none">
            ← Glisser pour tourner →
          </p>
        )}
      </div>

      {/* Angle buttons */}
      <div className="flex gap-2 justify-center">
        {ANGLES.map((a, i) => (
          <button
            key={i}
            onClick={() => { setAutoRotate(false); setAngleIdx(i); setCurrentRotY(a.rotY); }}
            className={`px-3 py-1 rounded-full text-xs border transition-all ${angleIdx === i ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Ad format info */}
      {adFormat && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <div className="w-4 h-4 rounded-sm shrink-0 ring-1 ring-border" style={{ backgroundColor: brandColor }} />
          <div>
            <p className="text-xs font-medium">{AD_FORMATS.find((f) => f.v === adFormat)?.l ?? adFormat}</p>
            <p className="text-[11px] text-muted-foreground">{AD_FORMATS.find((f) => f.v === adFormat)?.desc}</p>
          </div>
          <div className="ml-auto text-[11px] text-muted-foreground">
            Couverture : {Math.round(opacity * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}

export { AD_FORMATS };
