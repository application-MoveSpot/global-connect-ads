import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useVehiclePhotoUrls } from "@/hooks/useVehiclePhotoUrls";

type Props = {
  vehicleId: string;
  brandColor: string;
  logoUrl: string | null;
  videoFile?: File | null;
};

export function VehiclePhotoAdPreview({ vehicleId, brandColor, logoUrl, videoFile }: Props) {
  const [rawPhotos, setRawPhotos] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const photos = useVehiclePhotoUrls(rawPhotos);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!videoFile) { setVideoObjectUrl(null); return; }
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
        <span className="text-sm text-muted-foreground">Chargement des photos…</span>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="h-56 rounded-xl bg-secondary/40 border border-dashed border-border flex flex-col items-center justify-center gap-2">
        <span className="text-2xl">📷</span>
        <p className="text-sm text-muted-foreground">Photos en attente d'ajout par le propriétaire</p>
        <p className="text-xs text-muted-foreground/60">L'aperçu sera disponible dès qu'il aura mis en ligne ses photos.</p>
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
          alt="Véhicule"
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
            {/* Fond de la pub (semi-transparent, ne cascade pas sur le logo) */}
            <div
              style={{
                position: "absolute",
                inset: "20% 8%",
                background: brandColor,
                opacity: 0.65,
                borderRadius: 8,
                pointerEvents: "none",
              }}
            />

            {/* Logo au-dessus du fond — opacité pleine */}
            {logoUrl && (
              <img
                src={logoUrl}
                alt="logo"
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  maxHeight: "52%",
                  maxWidth: "66%",
                  objectFit: "contain",
                  pointerEvents: "none",
                  filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.45))",
                }}
              />
            )}
          </>
        )}

        {/* Navigation */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Photo précédente"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 hover:bg-background transition flex items-center justify-center text-lg"
              style={{ zIndex: 2 }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Photo suivante"
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
          ? "Aperçu de votre vidéo sur le véhicule — lecture automatique en boucle."
          : "Aperçu indicatif — l'emplacement exact sera précisé par le propriétaire dans sa proposition."}
      </p>
    </div>
  );
}
