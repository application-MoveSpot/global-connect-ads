import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { useCookieConsent } from "@/hooks/useCookieConsent";

interface MapConsentGateProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Affiche un placeholder si l'utilisateur a refusé les cookies Mapbox.
 * Lorsque le consentement est "accepted" ou non encore donné (null),
 * les enfants sont rendus normalement.
 */
export function MapConsentGate({ children, className }: MapConsentGateProps) {
  const consent = useCookieConsent();

  if (consent === "refused") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-secondary/30 p-8 text-center ${className ?? ""}`}
      >
        <MapPin className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground max-w-xs">
          La carte utilise Mapbox, un service tiers. Acceptez les cookies pour l'afficher.
        </p>
        <Link
          to="/cookies"
          className="text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          Gérer mes préférences →
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
