import { WifiOff, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function NetworkErrorBanner({ message, onRetry, retrying = false }: Props) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
    >
      <WifiOff size={16} className="shrink-0" />
      <span className="flex-1">{message ?? t("errors.network")}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="flex items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1 text-xs font-semibold transition hover:bg-destructive/15 disabled:opacity-50"
        >
          <RefreshCw size={12} className={retrying ? "animate-spin" : ""} />
          {retrying ? t("errors.retrying") : t("common.retry")}
        </button>
      )}
    </div>
  );
}
