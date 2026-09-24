import { useEffect, useState } from "react";

const PROD_HOST = "move-spot.com";

function isProduction() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return h === PROD_HOST || h === `www.${PROD_HOST}`;
}

export function TestEnvBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    setShowBanner(!isProduction());
  }, []);

  if (!showBanner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-400 text-amber-950 text-center text-sm font-bold px-4 py-2 shadow"
    >
      ⚠ ENVIRONNEMENT DE TEST — Les données affichées sont fictives. Ne pas effectuer de paiements réels.
    </div>
  );
}
