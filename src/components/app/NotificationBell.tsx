import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Bell, BellOff } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";

interface Props {
  userId?: string | null;
}

export function NotificationBell({ userId = null }: Props) {
  const { t } = useTranslation();
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const { state: pushState, subscribe } = usePushSubscription(userId);
  const [open, setOpen] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!open) markAllRead();
    setOpen((v) => !v);
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    await subscribe();
    setSubscribing(false);
  };

  const showPushPrompt = userId && (pushState === "default" || pushState === "loading");
  const pushDenied = pushState === "denied";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition"
        aria-label={t("notif_bell.aria_label")}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">{t("notif_bell.header")}</span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                {t("notif_bell.btn_clear_all")}
              </button>
            )}
          </div>

          {showPushPrompt && (
            <div className="px-4 py-2.5 bg-primary/5 border-b border-primary/15 flex items-center justify-between gap-3 text-xs text-primary">
              <span>{t("notif_bell.push_prompt")}</span>
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="font-semibold underline whitespace-nowrap disabled:opacity-50"
              >
                {subscribing ? t("notif_bell.btn_activating") : t("notif_bell.btn_activate")}
              </button>
            </div>
          )}

          {pushDenied && (
            <div className="px-4 py-2.5 bg-secondary/40 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
              <BellOff size={12} className="shrink-0" />
              <span>{t("notif_bell.push_denied")}</span>
            </div>
          )}

          {pushState === "subscribed" && (
            <div className="px-4 py-2.5 bg-emerald-500/8 border-b border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-400">
              {t("notif_bell.push_subscribed")}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                {t("notif_bell.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id} className="hover:bg-secondary/40 transition">
                    {n.href ? (
                      <a href={n.href} onClick={() => setOpen(false)} className="block px-4 py-3 no-underline">
                        <NotifContent n={n} />
                      </a>
                    ) : (
                      <div className="px-4 py-3">
                        <NotifContent n={n} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifContent({ n }: { n: { title: string; body?: string; timestamp: number } }) {
  const { i18n } = useTranslation();
  return (
    <>
      <p className="text-sm font-medium text-foreground">{n.title}</p>
      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
      <p className="text-[10px] text-muted-foreground/60 mt-1">
        {new Date(n.timestamp).toLocaleString(i18n.language, {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </>
  );
}
