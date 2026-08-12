import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CreativeFiles } from "@/components/CreativeFiles";

type Props = {
  campaignRequestId: string;
  creativeFiles: string[] | null;
};

/**
 * Kit remis au poseur pour équiper le véhicule : le visuel fourni par l'annonceur
 * (affiche/vidéo, déjà uploadé côté campaign-creatives) + un QR code généré à la volée
 * à coller à côté, qui renvoie vers MoveSpot avec la référence de la campagne.
 */
export function InstallationKit({ campaignRequestId, creativeFiles }: Props) {
  const [qrImg, setQrImg] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://move-spot.com";
  const qrUrl = `${origin}/c/${campaignRequestId}?utm_source=qr_vehicule`;

  useEffect(() => {
    QRCode.toDataURL(qrUrl, { width: 320, margin: 1 })
      .then(setQrImg)
      .catch(() => setQrImg(null));
  }, [qrUrl]);

  const hasCreatives = Boolean(creativeFiles && creativeFiles.length > 0);

  return (
    <div className="mb-3 rounded-lg border border-border bg-secondary/20 p-3">
      <p className="mb-2 text-xs font-semibold">🖼 Kit de pose — affiche/vidéo et QR code à coller</p>

      {hasCreatives ? (
        <CreativeFiles paths={creativeFiles} />
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">
          Aucun visuel fourni par l'annonceur pour le moment — revenez plus tard ou contactez MoveSpot.
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        {qrImg ? (
          <img
            src={qrImg}
            alt="QR code à coller"
            width={88}
            height={88}
            className="rounded border border-border bg-white p-1"
          />
        ) : (
          <div className="h-[88px] w-[88px] shrink-0 animate-pulse rounded border border-border bg-secondary" />
        )}
        <div className="text-[11px] text-muted-foreground">
          <p>Imprimez ce QR et collez-le à côté du visuel sur le véhicule.</p>
          {qrImg ? (
            <a
              href={qrImg}
              download={`qr-movespot-${campaignRequestId}.png`}
              className="text-primary hover:underline"
            >
              Télécharger le QR
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
