import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  coveringProjection,
  FALLBACK_COVERING_QUAD,
  type CoveringEntry,
} from "@/lib/fleet/covering-geometry";

type Props = {
  brandColor: string;
  processedLogoUrl: string | null;
  isProcessingLogo: boolean;
  isLogoDetoured: boolean;
  zone: CoveringEntry | null;
  photoUrl: string;
};

export function CoveringOverlay({
  brandColor,
  processedLogoUrl,
  isProcessingLogo,
  isLogoDetoured,
  zone,
  photoUrl,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const points = zone?.points ?? FALLBACK_COVERING_QUAD;
  const projection = coveringProjection(points, size.width, size.height);
  const clipPath = `polygon(${points.map((p) => `${p.x * 100}% ${p.y * 100}%`).join(",")})`;

  // Vinyl simulation layers are only relevant when a solid colour backing is shown.
  // Hide vinyl only when the logo was actually background-removed (transparent PNG).
  // If detourage failed and processedLogoUrl is the original image, keep the vinyl
  // so the logo renders on top of the colour backing instead of over bare bodywork.
  const vinylVisible = !processedLogoUrl || isProcessingLogo || !isLogoDetoured;

  return (
    <>
      <div
        ref={ref}
        className="covering-clip"
        style={{ clipPath }}
        data-covering-zone={zone ? "defined" : "approximate"}
      >
        {projection && (
          <div
            className="covering-plane"
            data-covering-plane
            style={{
              width: projection.width,
              height: projection.height,
              transform: projection.transform,
            }}
          >
            {vinylVisible && <div className="covering-ink" style={{ background: brandColor }} />}
            {processedLogoUrl && !isProcessingLogo && (
              <img
                className="covering-logo"
                src={processedLogoUrl}
                alt="Logo publicitaire"
                draggable={false}
                style={!isLogoDetoured ? { mixBlendMode: "multiply" } : undefined}
              />
            )}
            {isProcessingLogo && (
              <div
                className="absolute inset-0 flex items-center justify-center text-primary-foreground"
                role="status"
                aria-label="Préparation du logo"
              >
                <LoaderCircle className="size-5 motion-safe:animate-spin" />
              </div>
            )}
            {vinylVisible && <div className="covering-sheen" />}
          </div>
        )}
        {/* Reuse real luminance, handles and panel seams at their original photo
            coordinates. Never warp this texture with the artwork. No canvas/CORS
            readback or generated relief is needed for private signed photos. */}
        {projection && vinylVisible && (
          <>
            <img
              className="covering-texture"
              src={photoUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
            <img
              className="covering-reflections"
              src={photoUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
            />
          </>
        )}
      </div>
      <div className="absolute bottom-2 left-2 rounded-full bg-background/80 text-foreground text-[10px] px-2 py-0.5 pointer-events-none">
        Aperçu simulé
      </div>
    </>
  );
}
