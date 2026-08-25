import { useState, useEffect, useRef, useCallback } from "react";

export type VehicleKey = "van" | "food_truck" | "voiture" | "taxi" | "scooter" | "velo_cargo" | "triporteur" | "camion_led" | "autre";

/**
 * Spécification technique du Camion Écran LED (vtype_boxled_generic).
 * Source : catalogue MoveSpot "Affichage Mobile — Utilitaire Châssis-Cabine Anonymisé 3.5t".
 */
export const CAMION_LED_SPEC = {
  id: "vtype_boxled_generic",
  name: "Camion Écran LED — Format Urbain",
  category: "Affichage Mobile",
  vehicleClass: "Utilitaire Châssis-Cabine 3.5 t (Permis B)",
  dimensions: { lengthMm: 5930, widthMm: 2350, heightMm: 3150 },
  screens: {
    type: "LED Extérieur Haute Luminosité (IP67)",
    activeFaces: ["gauche", "droite", "arrière"] as const,
    formats: ["Vidéo MP4", "Image JPEG/PNG", "Flux Dynamique HTML5"],
    resolution: { side: "3200×1920 px", rear: "1920×1920 px" },
  },
  tags: ["Urbain", "Événementiel", "Centre-ville", "Forte visibilité", "Campagne Vidéo"],
} as const;
export type AdFormat = "covering_total" | "demi_covering" | "stickers" | "affiche" | "boxled";

export const AD_FORMATS: { v: AdFormat; l: string; desc: string }[] = [
  { v: "covering_total", l: "Covering total", desc: "Habillage complet du véhicule" },
  { v: "demi_covering", l: "Demi-covering", desc: "Moitié inférieure" },
  { v: "stickers", l: "Stickers", desc: "Autocollants ciblés" },
  { v: "affiche", l: "Affiche", desc: "Panneau fixe" },
  { v: "boxled", l: "Écran LED/Vidéo", desc: "Fourgon publicitaire numérique (3 faces LED)" },
];

/**
 * BoxLED = fourgon/van publicitaire numérique intégrant un écran géant LED sur 3 faces.
 * Incompatible avec food_truck (cuisine mobile) et les deux-roues/cargo qui n'existent
 * pas en version BoxLED de série.
 */
export const BOXLED_INCOMPATIBLE: VehicleKey[] = [
  "food_truck", "scooter", "velo_cargo", "triporteur",
];

/** Retourne true si la combinaison véhicule × format est invalide. */
export function isFormatIncompatible(vehicleTypes: string[], format: AdFormat): boolean {
  if (format !== "boxled") return false;
  return vehicleTypes.some((t) => BOXLED_INCOMPATIBLE.includes(t as VehicleKey));
}

// Formats compatibles par type de support (undefined = tous) — utilisé côté propriétaire
export const VEHICLE_FORMATS: Partial<Record<VehicleKey, AdFormat[]>> = {
  camion_led:  ["boxled"],    // le camion_led est exclusivement un support BoxLED
  food_truck:  ["covering_total", "demi_covering", "stickers", "affiche"],
  scooter:     ["stickers", "affiche"],
  velo_cargo:  ["stickers", "affiche"],
  triporteur:  ["stickers", "affiche"],
};

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
  // Camion LED : angles orientés vers les 3 faces d'écran actives (gauche, droite, arrière)
  camion_led: [
    { label: "Écran ←", angle: 0 },
    { label: "3/4 Av.", angle: 45 },
    { label: "Cabine", angle: 90 },
    { label: "Écran arr.", angle: 180 },
    { label: "Écran →", angle: 270 },
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
  // Camion LED : L=5930mm / H_utile≈2650mm → ratio ≈ 2.24 (châssis-cabine 3.5t)
  camion_led: { label: "Camion LED", icon: "📺", aspectRatio: 2.24 },
  autre: { label: "Véhicule", icon: "🚗", aspectRatio: 2.0 },
};

type Props = {
  vehicleTypes: string[];
  adFormat: AdFormat | null;
  brandColor: string;
  logoUrl?: string | null;
  /** URL blob d'un fichier vidéo (MP4/WEBM) à afficher sur l'écran du véhicule */
  screenVideoUrl?: string | null;
};

export function VehicleMockup3D({ vehicleTypes, adFormat, brandColor, logoUrl, screenVideoUrl }: Props) {
  const [rotY, setRotY] = useState(0);
  const [isAuto, setIsAuto] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragBaseAngle = useRef(0);
  const intervalRef = useRef<number | null>(null);
  // Élément vidéo stable — jamais recréé par React lors des re-renders de rotation
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Ref miroir de la prop — mis à jour à chaque render sans useEffect, permet aux
  // callbacks stables ([] deps) de toujours lire la valeur courante sans closure périmée.
  const screenVideoUrlRef = useRef(screenVideoUrl);
  screenVideoUrlRef.current = screenVideoUrl;

  const supported: VehicleKey[] = ["van", "food_truck", "voiture", "taxi", "scooter", "velo_cargo", "triporteur", "camion_led"];
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

  // Met à jour la source vidéo sans remonter l'élément <video>.
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (screenVideoUrl) {
      // React écrit l'attribut HTML "muted" mais les navigateurs lisent la propriété DOM.
      // Sans cette ligne, play() échoue silencieusement (politique autoplay) et le video reste figé.
      vid.muted = true;
      vid.src = screenVideoUrl;
      vid.load(); // obligatoire quand src est défini par code (pas via le rendu React)
      vid.play().catch(() => {});
    } else {
      vid.pause();
      vid.removeAttribute("src");
      vid.load();
    }
  }, [screenVideoUrl]);

  // Callback ref stable pour l'élément <video> : montage une seule fois,
  // jamais recréé lors des re-renders de rotation.
  // Lit screenVideoUrlRef.current (toujours à jour) plutôt que la prop directement
  // pour éviter la closure périmée sur la valeur initiale null.
  const videoCallbackRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      el.muted = true; // propriété DOM — React ne la propage pas toujours depuis l'attribut JSX
      if (screenVideoUrlRef.current) {
        el.src = screenVideoUrlRef.current;
        el.load();
        el.play().catch(() => {});
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Ad overlay dimensions based on format (and vehicle type for boxled)
  const getAdOverlay = () => {
    const h = 80;
    switch (adFormat) {
      case "covering_total":
        return { top: 20, height: h, opacity: 0.75, isLed: false };
      case "demi_covering":
        return { top: 55, height: 45, opacity: 0.75, isLed: false };
      case "stickers":
        return { top: 30, height: 35, opacity: 0.65, isLed: false };
      case "affiche":
        return { top: 25, height: 50, opacity: 0.70, isLed: false };
      case "boxled":
        // Camion LED : panneaux LED pleine hauteur de la caisse (spec IP67 3×faces)
        // top=8 laisse juste la fenêtre de cabine, height=75 = quasi toute la caisse
        return vehicleKey === "camion_led"
          ? { top: 8, height: 75, opacity: 0.95, isLed: true }
          : { top: 20, height: 60, opacity: 0.85, isLed: true };
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
              filter: "drop-shadow(0 6px 12px rgba(0,0,0,0.25))",
            }}>
              {vehicleKey === "camion_led" ? (
                /* ── Chassis-cabine LED (Sprinter 314 type) ──────────────────────
                   Cabine : ~32% de la longueur, plus basse que la caisse
                   Caisse : ~68%, pleine hauteur, panneau LED sur toute la face
                   Layout miroir quand isFacingBack (vue droite / arrière)         */
                <>
                  <div style={{ position: "relative", width: 215, height: 90 }}>

                    {/* ── Caisse LED ── */}
                    <div style={{
                      position: "absolute",
                      left: isFacingBack ? 0 : "33%",
                      right: isFacingBack ? "33%" : 0,
                      top: 0,
                      height: 82,
                      background: "#0c0c0c",
                      border: "2px solid #1e1e1e",
                      borderRadius: isFacingBack ? "2px 1px 1px 2px" : "1px 3px 3px 1px",
                      overflow: "hidden",
                    }}>
                      {/* Cadre aluminium intérieur (profil de la dalle LED) */}
                      <div style={{
                        position: "absolute",
                        inset: "4px 3px 10px 3px",
                        background: screenVideoUrl
                          ? "#000"
                          : adFormat === "boxled"
                            ? (logoUrl ? brandColor : "#060d1a")
                            : "#111",
                        borderRadius: 1,
                        boxShadow: adFormat === "boxled"
                          ? "inset 0 0 0 1px rgba(80,140,255,0.25), 0 0 10px 2px rgba(50,120,255,0.18)"
                          : undefined,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                      }}>
                        {adFormat === "boxled" && !screenVideoUrl && logoUrl && (
                          <img src={logoUrl} alt="logo"
                            style={{ maxHeight: "85%", maxWidth: "85%", objectFit: "contain", opacity: 0.95 }} />
                        )}
                        {adFormat === "boxled" && !screenVideoUrl && !logoUrl && (
                          <span style={{ fontSize: 6.5, color: "rgba(100,160,255,0.5)", textAlign: "center", lineHeight: 1.4, letterSpacing: "0.04em" }}>
                            LED IP67{"\n"}3200×1920 px
                          </span>
                        )}
                      </div>
                      {/* Lisse basse (seuil structural de caisse) */}
                      <div style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: 8,
                        background: "#181818",
                        borderTop: "1px solid #333",
                      }} />
                    </div>

                    {/* ── Cabine ── */}
                    <div style={{
                      position: "absolute",
                      left: isFacingBack ? "69%" : 0,
                      width: "33%",
                      top: 20,
                      height: 62,
                      background: "#111",
                      border: "2px solid #1e1e1e",
                      borderRadius: isFacingBack ? "1px 5px 4px 1px" : "5px 1px 1px 5px",
                      overflow: "hidden",
                    }}>
                      {/* Pare-brise / vitre arrière */}
                      <div style={{
                        position: "absolute",
                        top: 5,
                        left: isFacingBack ? 4 : 5,
                        right: isFacingBack ? 5 : 4,
                        height: 18,
                        background: "rgba(80,140,220,0.12)",
                        borderRadius: isFacingBack ? "2px 4px 0 0" : "4px 2px 0 0",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }} />
                      {/* Rétroviseur (côté profil seulement) */}
                      {!isFacingBack && (
                        <div style={{
                          position: "absolute",
                          right: -5,
                          top: 20,
                          width: 6,
                          height: 9,
                          background: "#1a1a1a",
                          borderRadius: "0 2px 2px 0",
                          border: "1px solid #2a2a2a",
                        }} />
                      )}
                    </div>

                    {/* Vidéo : couvre exactement le panneau LED de la caisse */}
                    <video
                      ref={videoCallbackRef}
                      loop muted playsInline
                      style={{
                        position: "absolute",
                        left: isFacingBack ? "3px" : "calc(33% + 3px)",
                        right: isFacingBack ? "calc(33% + 3px)" : "3px",
                        top: "4px",
                        height: 68,
                        objectFit: "cover",
                        display: (adFormat === "boxled" && screenVideoUrl) ? "block" : "none",
                        zIndex: 3,
                        borderRadius: 1,
                      }}
                    />
                  </div>

                  {/* Roues camion (avant sous cabine, arrière double sous caisse) */}
                  <div style={{ position: "relative", width: 215, height: 28, marginTop: 1 }}>
                    {/* Roue avant */}
                    <div style={{
                      position: "absolute",
                      left: isFacingBack ? 155 : 20,
                      width: 28, height: 28, borderRadius: "50%",
                      background: "radial-gradient(circle at 35% 35%, #3a3a5c, #1a1a2e)",
                      border: "2.5px solid #2d2d4e",
                      boxShadow: "inset 0 0 0 5px #2d2d4e, inset 0 0 0 7px #3a3a5c",
                    }} />
                    {/* Roue arrière (jumelée — Sprinter 314) */}
                    {[0, 1].map((i) => (
                      <div key={i} style={{
                        position: "absolute",
                        left: isFacingBack ? (4 + i * 9) : (154 + i * 9),
                        width: 24, height: 28, borderRadius: "50%",
                        background: "radial-gradient(circle at 35% 35%, #3a3a5c, #1a1a2e)",
                        border: "2.5px solid #2d2d4e",
                        boxShadow: "inset 0 0 0 4px #2d2d4e, inset 0 0 0 6px #3a3a5c",
                      }} />
                    ))}
                  </div>
                </>
              ) : (
                /* ── Véhicule standard (van, voiture, scooter…) ── */
                <>
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

                    {/* Ad overlay (fond couleur + logo) */}
                    {overlay && (
                      <div style={{
                        position: "absolute",
                        top: overlay.top,
                        left: "5%",
                        right: "5%",
                        height: overlay.height,
                        background: screenVideoUrl ? "#000" : brandColor,
                        opacity: overlay.opacity,
                        borderRadius: 4,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        zIndex: 1,
                      }}>
                        {!screenVideoUrl && logoUrl && (
                          <img src={logoUrl} alt="logo"
                            style={{ maxHeight: "85%", maxWidth: "85%", objectFit: "contain", opacity: 0.95 }} />
                        )}
                      </div>
                    )}

                    {/* <video> toujours dans le DOM — stable face aux re-renders de rotation */}
                    <video
                      ref={videoCallbackRef}
                      loop muted playsInline
                      style={{
                        position: "absolute",
                        top: overlay ? overlay.top : 0,
                        left: "5%",
                        right: "5%",
                        height: overlay ? overlay.height : 0,
                        maxWidth: "90%",
                        objectFit: "cover",
                        display: (overlay && screenVideoUrl) ? "block" : "none",
                        zIndex: 2,
                        borderRadius: 4,
                      }}
                    />
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
                </>
              )}
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
      </div>

      {/* Angle indicators */}
      {(() => {
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
