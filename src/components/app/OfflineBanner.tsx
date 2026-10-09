import { WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineBanner() {
  const { t } = useTranslation();
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground"
    >
      <WifiOff size={13} className="shrink-0" />
      {t("offline_banner.msg")}
    </div>
  );
}
