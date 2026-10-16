import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const PROD_HOSTS = ["move-spot.com", "www.move-spot.com"];

function isProduction() {
  if (typeof window === "undefined") return true;
  const h = window.location.hostname;
  return PROD_HOSTS.includes(h) || h.startsWith("movespot-global.");
}

export function TestEnvBanner() {
  const { t } = useTranslation();
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
      {t("test_env_banner.msg")}
    </div>
  );
}
