import { useState, useEffect, useRef } from "react";

export type VehicleKey = "van" | "food_truck" | "voiture" | "taxi" | "scooter" | "velo_cargo" | "triporteur" | "autre";
export type AdFormat = "covering_total" | "demi_covering" | "stickers" | "video_led" | "affiche";

export const AD_FORMATS: { v: AdFormat; l: string; desc: string }[] = [
  { v: "covering_total", l: "Covering total", desc: "Habillage complet du véhicule" },
  { v: "demi_covering", l: "Demi-covering", desc: "Moitié inférieure" },
  { v: "stickers", l: "Stickers", desc: "Autocollants ciblés" },
  { v: "video_led", l: "Écran LED/Vidéo", desc: "Écran numérique" },
  { v: "affiche", l: "Affiche", desc: "Panneau fixe" },
];

// Formats compatibles par type de support (undefined = tous)
export const VEHICLE_FORMATS: Partial<Record<VehicleKey, AdFormat[]>> = {};

type AngleConfig = { label: string; angle: number };

const DEFAULT_ANGLES: AngleConfig[] = [
  { label: "Profil", angle: 0 },
  { label: "3/4 Av.", angle: 45 },
  { label: "Face", angle: 90 },
  { label: "3/4 Ar.", angle: 315 },
];

// Angles pertinents selon le type de support publicitaire
export const VEHICLE_ANGLES: Partial<Record<VehicleKey, AngleConfig[]>> = {
  van: [
    { label: "Profil", angle: 0 },
    { label: "3/4 Av.", angle: 45 },
    { label: "Face", angle: 90 },
    { label: "Dos", angle: 180 },
    { label: "3/4 Ar.", angle: 315 },
  ],
  food_truck: [
    { label: "Profil", angle: 0 },
    { label: "3/4 Av.", angle: 45 },
    { label: "Face", angle: 90 },
    { label: "Dos", angle: 180 },
    { label: "3/4 Ar.", angle: 315 },
  ],
  voiture: [
    { label: "Profil", angle: 0 },
    { label: "3/4 Av.", angle: 45 },
    { label: "Face", angle: 90 },
    { label: "3/4 Ar.", angle: 315 },
  ],
  taxi: [
    { label: "Profil", angle: 0 },
    { label: "3/4 Av.", angle: 45 },
    { label: "Face", angle: 90 },
    { label: "3/4 Ar.", angle: 315 },
  ],
  scooter: [
    { label: "Profil", angle: 0 },
    { label: "3/4", angle: 50 },
    { label: "Face", angle: 90 },
  ],
  velo_cargo: [
    { label: "Profil", angle: 0 },
    { label: "3/4", angle: 45 },
    { label: "Face", angle: 90 },
  ],
  triporteur: [
    { label: "Profil", angle: 0 },
    { label: "Face", angle: 90 },
    { label: "Arrière", angle: 180 },
  ],
  // walkers → pas d'angles (géré séparément via isWalker)
};

const VEHICLE_INFO: Record<VehicleKey, { label: string; icon: string; aspectRatio: number }> = {
  van: { label: "Van", icon: "🚐", aspectRatio: 2.2 },
  food_truck: { label: "Food Truck", icon: "🚚", aspectRatio: 2.0 },
  voiture: { label: "Voiture", icon: "🚗", aspectRatio: 2.1 },
  taxi: { label: "Taxi", icon: "🚕", aspectRatio: 2.1 },
  scooter: { label: "Scooter", icon: "🛵", aspectRatio: 1.2 },
  velo_cargo: { label: "Vélo cargo", icon: "🚲", aspectRatio: 1.6 },
  triporteur: { label: "Triporteur", icon: "🛺", aspectRatio: 1.5 },
  sac_a_dos_lcd: { label: "Sac à dos LCD", icon: "🎒", aspectRatio: 0.7 },
  sac_a_dos_affiche: { label: "Sac à dos affiche", icon: "🎒", aspectRatio: 0.7 },
  autre: { label: "Véhicule", icon: "🚗", aspectRatio: 2.0 },
};

type Props = {
  vehicleTypes: string[];
  adFormat: AdFormat | null;
  brandColor: string;
  logoUrl?: string | null;
};

export function VehicleMockup3D({ vehicleTypes, adFormat, brandColor, logoUrl }: Props) {
  const [rotY, setRotY] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragBaseAngle = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const supported: VehicleKey[] = ["van", "food_truck", "voiture", "taxi", "scooter", "velo_cargo", "triporteur", "sac_a_dos_lcd", "sac_a_dos_affiche"];
  const vehicleKey: VehicleKey = (supported.find((k) => vehicleTypes.includes(k)) ?? "autre") as VehicleKey;
  const isWalker = vehicleKey === "sac_a_dos_lcd" || vehicleKey === "sac_a_dos_affiche";
  const info = VEHICLE_INFO[vehicleKey];

  useEffect(() => {
    if (isAuto && !isDragging) {
      intervalRef.current = window.setInterval(() => {
        setRotY((r) => (r + 1) % 360);
      }, 30);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isAuto, isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsAuto(false);
    dragStartX.current = e.clientX;
    dragBaseAngle.current = rotY;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = (e.clientX - dragStartX.current) * 0.8;
    setRotY((dragBaseAngle.current + delta) % 360);
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setIsAuto(false);
    dragStartX.current = e.touches[0].clientX;
    dragBaseAngle.current = rotY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = (e.touches[0].clientX - dragStartX.current) * 0.8;
    setRotY((dragBaseAngle.current + delta) % 360);
  };

  // Map rotation to visual scale (simulates 3D perspective)
  const normalized = ((rotY % 360) + 360) % 360;
  const rad = (normalized * Math.PI) / 180;
  const cosVal = Math.cos(rad);
  const scaleX = Math.max(0.1, Math.abs(cosVal));
  const isFacingBack = cosVal < 0;

  // Ad overlay dimensions based on format
  const getAdOverlay = () => {
    const w = 180 * scaleX;
    const h = 80;
    switch (adFormat) {
      case "covering_total":
        return { top: 20, height: h, opacity: 0.75 };
      case "demi_covering":
        return { top: 55, height: 45, opacity: 0.75 };
      case "stickers":
        return { top: 30, height: 35, opacity: 0.65 };
      case "video_led":
        return { top: 28, height: 44, opacity: 0.85 };
      case "affiche":
        return { top: 25, height: 50, opacity: 0.70 };
      default:
        return null;
    }
  };

  const overlay = getAdOverlay();
  const formatInfo = AD_FORMATS.find((f) => f.v === adFormat);

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid hsl(var(--border))",
        background: "linear-gradient(135deg, hsl(var(--secondary)/30%) 0%, hsl(var(--background)) 100%)",
        padding: 16,
        userSelect: "none",
      }}
    >
      {/* Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Prévisualisation 3D
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {info.icon} {info.label}
          </div>
        </div>
        {!isWalker && (
          <button
            type="button"
            onClick={() => setIsAuto((v) => !v)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              border: "1px solid hsl(var(--border))",
              background: isAuto ? "hsl(var(--primary))" : "hsl(var(--card))",
              color: isAuto ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
              cursor: "pointer",
            }}
          >
            {isAuto ? "⏸ Stop" : "▶ Auto 360°"}
          </button>
        )}
      </div>

      {/* 3D Viewport */}
      <div
        style={{
          height: 160,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderRadius: 12,
          background: "hsl(var(--secondary)/20%)",
          cursor: isWalker ? "default" : isDragging ? "grabbing" : "grab",
          overflow: "hidden",
        }}
        onMouseDown={isWalker ? undefined : handleMouseDown}
        onMouseMove={isWalker ? undefined : handleMouseMove}
        onMouseUp={isWalker ? undefined : handleMouseUp}
        onMouseLeave={isWalker ? undefined : handleMouseUp}
        onTouchStart={isWalker ? undefined : handleTouchStart}
        onTouchMove={isWalker ? undefined : handleTouchMove}
        onTouchEnd={isWalker ? undefined : () => setIsDragging(false)}
      >
        {isWalker ? (
          /* Walker SVG */
          <svg viewBox="0 0 160 150" width="160" height="150" style={{ filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.18))" }}>
            {/* Ground shadow */}
            <ellipse cx="72" cy="143" rx="28" ry="5" fill="rgba(0,0,0,0.13)" />
            {/* Head */}
            <circle cx="72" cy="22" r="13" fill="#d1bfa8" stroke="#b09880" strokeWidth="1.5" />
            {/* Body */}
            <rect x="58" y="38" width="26" height="38" rx="5" fill="#6b7280" />
            {/* Left arm (front) */}
            <line x1="58" y1="46" x2="42" y2="66" stroke="#6b7280" strokeWidth="7" strokeLinecap="round" />
            {/* Right arm (back) */}
            <line x1="84" y1="46" x2="90" y2="68" stroke="#4b5563" strokeWidth="6" strokeLinecap="round" />
            {/* Left leg */}
            <line x1="65" y1="76" x2="58" y2="112" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
            {/* Right leg (slightly offset = walking) */}
            <line x1="74" y1="76" x2="82" y2="108" stroke="#374151" strokeWidth="8" strokeLinecap="round" />
            {/* Feet */}
            <ellipse cx="57" cy="115" rx="9" ry="4" fill="#1f2937" />
            <ellipse cx="83" cy="111" rx="9" ry="4" fill="#1f2937" />

            {/* Backpack frame */}
            <rect x="84" y="36" width="36" height="50" rx="5" fill="#e5e7eb" stroke="#d1d5db" strokeWidth="1.5" />
            {/* Backpack strap */}
            <line x1="84" y1="42" x2="84" y2="76" stroke="#9ca3af" strokeWidth="3" />

            {/* Screen / affiche on backpack */}
            <rect
              x="88" y="40" width="28" height="42" rx="3"
              fill={brandColor}
              opacity="0.88"
            />
            {vehicleKey === "sac_a_dos_lcd" && (
              <>
                {/* LCD glow border */}
                <rect x="88" y="40" width="28" height="42" rx="3" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.6" />
                <rect x="90" y="42" width="24" height="38" rx="2" fill="none" stroke={brandColor} strokeWidth="2" opacity="0.4"
                  style={{ filter: "blur(2px)" }} />
                {!logoUrl && (
                  <text x="102" y="65" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold" opacity="0.9">
                    📺 LED
                  </text>
                )}
              </>
            )}
            {vehicleKey === "sac_a_dos_affiche" && !logoUrl && (
              <text x="102" y="65" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold" opacity="0.9">
                AFFICHE
              </text>
            )}
            {logoUrl && (
              <image href={logoUrl} x="90" y="42" width="24" height="38" preserveAspectRatio="xMidYMid meet" />
            )}
          </svg>
        ) : (
          <>
            {/* Ground shadow */}
            <div style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              width: 180 * scaleX,
              height: 10,
              borderRadius: "50%",
              background: "rgba(0,0,0,0.15)",
              filter: "blur(6px)",
              transition: "width 0.05s linear",
            }} />

            {/* Vehicle body */}
            <div style={{
              position: "relative",
              transform: `scaleX(${scaleX})`,
              transition: isDragging ? "none" : "transform 0.05s linear",
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.2))",
            }}>
              {/* Main body */}
              <div style={{
                width: 200,
                height: 90,
                borderRadius: vehicleKey === "voiture" || vehicleKey === "taxi" ? "30px 30px 10px 10px" : "8px 8px 6px 6px",
                background: isFacingBack ? "hsl(var(--secondary))" : "hsl(var(--card))",
                border: "2px solid hsl(var(--border))",
                position: "relative",
                overflow: "hidden",
              }}>
                {/* Windows area */}
                {!isFacingBack && (
                  <div style={{
                    position: "absolute",
                    top: 8,
                    left: vehicleKey === "scooter" ? "20%" : "15%",
                    right: "15%",
                    height: vehicleKey === "voiture" || vehicleKey === "taxi" ? 38 : 32,
                    borderRadius: vehicleKey === "voiture" || vehicleKey === "taxi" ? "20px 20px 0 0" : "6px 6px 0 0",
                    background: "hsl(var(--primary)/15%)",
                    border: "1.5px solid hsl(var(--border))",
                  }} />
                )}

                {/* Ad overlay */}
                {overlay && (
                  <div style={{
                    position: "absolute",
                    top: overlay.top,
                    left: "5%",
                    right: "5%",
                    height: overlay.height,
                    background: brandColor,
                    opacity: overlay.opacity,
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {logoUrl && (
                      <img
                        src={logoUrl}
                        alt="logo"
                        style={{ maxHeight: "85%", maxWidth: "85%", objectFit: "contain", opacity: 0.95 }}
                      />
                    )}
                    {adFormat === "video_led" && !logoUrl && (
                      <div style={{
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: 700,
                        textAlign: "center",
                        textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                      }}>
                        📺 ÉCRAN LED
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Wheels */}
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: 20, paddingRight: 20, marginTop: 2 }}>
                {[0, 1].map((i) => (
                  <div key={i} style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 35%, #3a3a5c, #1a1a2e)",
                    border: "3px solid #2d2d4e",
                    boxShadow: "inset 0 0 0 6px #2d2d4e, inset 0 0 0 8px #3a3a5c",
                  }} />
                ))}
              </div>
            </div>

            {/* Hint */}
            {!isDragging && !isAuto && (
              <div style={{
                position: "absolute",
                bottom: 6,
                right: 10,
                fontSize: 10,
                color: "hsl(var(--muted-foreground))",
                pointerEvents: "none",
              }}>
                ← Glisser pour tourner →
              </div>
            )}
          </>
        )}
      </div>

      {/* Angle indicators (véhicules uniquement) */}
      {!isWalker && (() => {
        const angles = VEHICLE_ANGLES[vehicleKey] ?? DEFAULT_ANGLES;
        return (
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
            {angles.map(({ label, angle }) => {
              const diff = Math.min(
                ((normalized - angle + 360) % 360),
                ((angle - normalized + 360) % 360),
              );
              const isActive = diff < 25;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { setIsAuto(false); setRotY(angle); }}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 11,
                    border: "1px solid hsl(var(--border))",
                    background: isActive ? "hsl(var(--primary))" : "hsl(var(--card))",
                    color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Format info */}
      {formatInfo && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--card))",
        }}>
          <div style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            background: brandColor,
            outline: "1px solid hsl(var(--border))",
          }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{formatInfo.l}</div>
            <div style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{formatInfo.desc}</div>
          </div>
        </div>
      )}
    </div>
  );
}
