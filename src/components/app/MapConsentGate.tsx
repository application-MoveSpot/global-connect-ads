import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCookieConsent } from "@/hooks/useCookieConsent";
import { setConsent } from "@/lib/consent";

interface MapConsentGateProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Bloque le chargement de Mapbox tant que le consentement n'est pas "accepted"
 * (ePrivacy / RGPD art. 82 — pas de traceur tiers avant accord explicite).
 */
export function MapConsentGate({ children, className }: MapConsentGateProps) {
  const { t } = useTranslation();
  const consent = useCookieConsent();

  if (consent !== "accepted") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center ${className ?? ""}`}
      >
        <MapPin className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground max-w-xs">{t("map_consent_gate.msg")}</p>
        <button
          onClick={() => setConsent("accepted")}
          className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {t("map_consent_gate.btn_activate")}
        </button>
        <Link
          to="/cookies"
          className="text-xs text-muted-foreground/70 underline underline-offset-2 hover:text-muted-foreground"
        >
          {t("map_consent_gate.btn_manage")}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
