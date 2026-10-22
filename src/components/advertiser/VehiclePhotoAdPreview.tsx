import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";

type Props = {
  vehicleId: string;
  brandColor: string;
  logoUrl: string | null;
  videoFile?: File | null;
};

export function VehiclePhotoAdPreview({ vehicleId, brandColor, logoUrl, videoFile }: Props) {
  const { t } = useTranslation();
  const [rawPhotos, setRawPhotos] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const photos = useVehiclePhotoUrls(rawPhotos);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

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
      .select("photos")
      .eq("id", vehicleId)
      .single()
      .then(({ data }) => setRawPhotos(data?.photos ?? []));
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
          <>
            {/* Covering : image publicitaire ou couleur de marque — zone portes uniquement */}
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="covering"
                style={{
                  position: "absolute",
                  top: "35%",
                  right: "40%",
                  bottom: "25%",
                  left: "12%",
                  objectFit: "fill",
                  borderRadius: 6,
                  mixBlendMode: "multiply",
                  opacity: 0.9,
                  pointerEvents: "none",
                }}
              />
            ) : (
              <div
                style={{
                  position: "absolute",
                  top: "35%",
                  right: "40%",
                  bottom: "25%",
                  left: "12%",
                  background: brandColor,
                  opacity: 0.82,
                  borderRadius: 6,
                  mixBlendMode: "multiply",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Dégradé de lumière simulant la courbure du véhicule */}
            <div
              style={{
                position: "absolute",
                top: "35%",
                right: "40%",
                bottom: "25%",
                left: "12%",
                borderRadius: 6,
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 40%, rgba(0,0,0,0.12) 100%)",
                pointerEvents: "none",
              }}
            />

            {/* Ombre interne sur les bords (effet de relief) */}
            <div
              style={{
                position: "absolute",
                top: "35%",
                right: "40%",
                bottom: "25%",
                left: "12%",
                borderRadius: 6,
                boxShadow: "inset 0 0 18px rgba(0,0,0,0.28)",
                pointerEvents: "none",
              }}
            />

            {/* Badge "Aperçu simulé" */}
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
              Aperçu simulé
            </div>
          </>
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
