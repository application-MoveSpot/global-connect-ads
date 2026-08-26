import { useRef, useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/notifications/browser";

export function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

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

  const enableNotifs = async () => {
    const p = await requestNotificationPermission();
    setPermission(p);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition"
        aria-label="Notifications"
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
            <span className="text-sm font-semibold">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-foreground transition"
              >
                Tout effacer
              </button>
            )}
          </div>

          {permission === "default" && (
            <div className="px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-700 dark:text-amber-300">
              <span>Activez les notifications pour ne rien rater.</span>
              <button onClick={enableNotifs} className="font-semibold underline whitespace-nowrap">
                Activer
              </button>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Aucune notification pour l'instant.
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
  return (
    <>
      <p className="text-sm font-medium text-foreground">{n.title}</p>
      {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
      <p className="text-[10px] text-muted-foreground/60 mt-1">
        {new Date(n.timestamp).toLocaleString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </>
  );
}
