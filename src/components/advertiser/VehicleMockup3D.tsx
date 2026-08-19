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

const VEHICLE_INFO: Record<VehicleKey, { label: string; icon: string; aspectRatio: number }> = {
  van: { label: "Van", icon: "🚐", aspectRatio: 2.2 },
  food_truck: { label: "Food Truck", icon: "🚚", aspectRatio: 2.0 },
  voiture: { label: "Voiture", icon: "🚗", aspectRatio: 2.1 },
  taxi: { label: "Taxi", icon: "🚕", aspectRatio: 2.1 },
  scooter: { label: "Scooter", icon: "🛵", aspectRatio: 1.2 },
  velo_cargo: { label: "Vélo cargo", icon: "🚲", aspectRatio: 1.6 },
  triporteur: { label: "Triporteur", icon: "🛺", aspectRatio: 1.5 },
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

  const supported: VehicleKey[] = ["van", "food_truck", "voiture", "taxi", "scooter", "velo_cargo", "triporteur"];
  const vehicleKey: VehicleKey = (supported.find((k) => vehicleTypes.includes(k)) ?? "autre") as VehicleKey;
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
          cursor: isDragging ? "grabbing" : "grab",
          overflow: "hidden",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setIsDragging(false)}
      >
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
      </div>

      {/* Angle indicators */}
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
        {["Profil", "3/4 Av.", "Face", "3/4 Ar."].map((label, i) => {
          const targetAngle = [0, 45, 90, 315][i];
          const isActive = Math.abs(((normalized - targetAngle + 360) % 360) - 0) < 25 ||
            (i === 3 && normalized > 290);
          return (
            <button
              key={label}
              type="button"
              onClick={() => { setIsAuto(false); setRotY([0, 45, 90, 315][i]); }}
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
