import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import QRCode from "qrcode";
import { CreativeFiles } from "@/components/shared/CreativeFiles";

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
  const { t } = useTranslation();
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
      <p className="mb-2 text-xs font-semibold">{t("installation_kit.title")}</p>

      {hasCreatives ? (
        <CreativeFiles paths={creativeFiles} />
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">
          {t("installation_kit.no_creative")}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        {qrImg ? (
          <img
            src={qrImg}
            alt={t("installation_kit.qr_alt")}
            width={88}
            height={88}
            className="rounded border border-border bg-white p-1"
          />
        ) : (
          <div className="h-[88px] w-[88px] shrink-0 animate-pulse rounded border border-border bg-secondary" />
        )}
        <div className="text-[11px] text-muted-foreground">
          <p>{t("installation_kit.qr_instructions")}</p>
          {qrImg ? (
            <a
              href={qrImg}
              download={`qr-movespot-${campaignRequestId}.png`}
              className="text-primary hover:underline"
            >
              {t("installation_kit.btn_download")}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
