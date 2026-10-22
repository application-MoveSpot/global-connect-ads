import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";
import { useProcessedLogo } from "@/hooks/useProcessedLogo";
import type { CoveringZone } from "@/hooks/useCoveringZone";

type Props = {
  vehicleId: string;
  brandColor: string;
  logoUrl: string | null;
  videoFile?: File | null;
};

export function VehiclePhotoAdPreview({ vehicleId, brandColor, logoUrl, videoFile }: Props) {
  const { t } = useTranslation();
  const [rawPhotos, setRawPhotos] = useState<string[] | null>(null);
  const [coveringZone, setCoveringZone] = useState<CoveringZone | null>(null);
  const [index, setIndex] = useState(0);
  const photos = useVehiclePhotoUrls(rawPhotos);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const { processedUrl: processedLogoUrl, isProcessing: isProcessingLogo } = useProcessedLogo(logoUrl);

  useEffect(() => {
    if (!videoFile) {
      setVideoObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(videoFile);
    setVideoObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [videoFile]);

  useEffect(() => {
    setIndex(0);
    setRawPhotos(null);
    supabase
      .from("vehicles")
      .select("photos, covering_zone")
      .eq("id", vehicleId)
      .single()
      .then(({ data }) => {
        setRawPhotos(data?.photos ?? []);
        setCoveringZone((data?.covering_zone as CoveringZone) ?? null);
      });
  }, [vehicleId]);

  if (rawPhotos === null) {
    return (
      <div className="h-56 rounded-xl bg-secondary/40 flex items-center justify-center animate-pulse">
        <span className="text-sm text-muted-foreground">{t("vehicle_photo_preview.loading")}</span>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="h-56 rounded-xl bg-secondary/40 border border-dashed border-border flex flex-col items-center justify-center gap-2">
        <span className="text-2xl">📷</span>
        <p className="text-sm text-muted-foreground">{t("vehicle_photo_preview.no_photos")}</p>
        <p className="text-xs text-muted-foreground/60">
          {t("vehicle_photo_preview.no_photos_hint")}
        </p>
      </div>
    );
  }

  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
        <img
          src={photos[index]}
          alt={t("ad_spots.vehicle_fallback")}
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />

        {videoObjectUrl ? (
          /* Video creative overlay for LED/screen vehicles */
          <video
            src={videoObjectUrl}
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: "absolute",
              inset: "10% 6%",
              width: "88%",
              height: "80%",
              objectFit: "contain",
              borderRadius: 6,
              pointerEvents: "none",
            }}
          />
        ) : (
          <CoveringOverlay
            brandColor={brandColor}
            processedLogoUrl={processedLogoUrl}
            isProcessingLogo={isProcessingLogo}
            zone={coveringZone?.[index] ?? null}
          />
        )}

        {/* Navigation */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t("vehicle_photo_preview.aria_prev")}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 hover:bg-background transition flex items-center justify-center text-lg"
              style={{ zIndex: 2 }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("vehicle_photo_preview.aria_next")}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 hover:bg-background transition flex items-center justify-center text-lg"
              style={{ zIndex: 2 }}
            >
              ›
            </button>
            <div
              className="absolute bottom-2 right-2 text-xs bg-background/70 text-foreground rounded-full px-2 py-0.5"
              style={{ zIndex: 2 }}
            >
              {index + 1}/{photos.length}
            </div>
          </>
        )}
      </div>

      {/* Vignettes */}
      {photos.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {photos.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              className={`shrink-0 w-14 h-10 rounded overflow-hidden border-2 transition ${
                i === index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {videoObjectUrl
          ? t("vehicle_photo_preview.caption_video")
          : t("vehicle_photo_preview.caption_image")}
      </p>
    </div>
  );
}

// ─── Sub-component: covering overlay ─────────────────────────────────────────

type ZoneEntry = { points: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }] };

function CoveringOverlay({
  brandColor,
  processedLogoUrl,
  isProcessingLogo,
  zone,
}: {
  brandColor: string;
  processedLogoUrl: string | null;
  isProcessingLogo: boolean;
  zone: ZoneEntry | null;
}) {
  // If the owner defined a zone, use clip-path polygon (precise geometry)
  // Otherwise fall back to approximate CSS percentages
  const hasZone = !!zone;

  const clipPath = hasZone
    ? `polygon(${zone.points.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(", ")})`
    : undefined;

  // Bounding box of the zone for logo positioning (keeps logo inside the quad)
  const logoBounds = hasZone
    ? {
        top: `${Math.min(...zone.points.map((p) => p.y)) * 100}%`,
        left: `${Math.min(...zone.points.map((p) => p.x)) * 100}%`,
        right: `${(1 - Math.max(...zone.points.map((p) => p.x))) * 100}%`,
        bottom: `${(1 - Math.max(...zone.points.map((p) => p.y))) * 100}%`,
      }
    : { top: "37%", right: "42%", bottom: "27%", left: "14%" };

  // Shared style for all covering layers
  const layerStyle: React.CSSProperties = hasZone
    ? { position: "absolute", inset: 0, clipPath, pointerEvents: "none" }
    : {
        position: "absolute",
        top: "35%",
        right: "40%",
        bottom: "25%",
        left: "12%",
        borderRadius: 6,
        pointerEvents: "none",
      };

  return (
    <>
      {/* Brand color base */}
      <div
        style={{
          ...layerStyle,
          background: brandColor,
          opacity: 0.78,
          mixBlendMode: "multiply",
        }}
      />

      {/* Logo without background */}
      {isProcessingLogo && (
        <div
          style={{
            position: "absolute",
            ...logoBounds,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid rgba(255,255,255,0.4)",
              borderTopColor: "#fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      )}
      {processedLogoUrl && !isProcessingLogo && (
        <img
          src={processedLogoUrl}
          alt="covering"
          style={{
            position: "absolute",
            ...logoBounds,
            objectFit: "contain",
            opacity: 0.95,
            pointerEvents: "none",
            mixBlendMode: "multiply",
          }}
        />
      )}

      {/* Light gradient (surface curvature effect) */}
      <div
        style={{
          ...layerStyle,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 40%, rgba(0,0,0,0.12) 100%)",
        }}
      />

      {/* Inner shadow (relief effect) — gradient-based for clip-path compat */}
      <div
        style={{
          ...layerStyle,
          background:
            "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.22) 100%)",
        }}
      />

      {/* Badge */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          background: "rgba(0,0,0,0.55)",
          color: "#fff",
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 99,
          pointerEvents: "none",
          letterSpacing: "0.04em",
        }}
      >
        {hasZone ? "Aperçu précis" : "Aperçu simulé"}
      </div>
    </>
  );
}
